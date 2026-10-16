import React, { useEffect, useMemo, useState } from "react";
import { loadGroups } from "../lib/storage.js";
import { getBoardMembers, memberMap, resolveMembers } from "../lib/members.js";
import { buildCommentText } from "../lib/mentions.js";
import { NOT_AUTHORIZED, postCardComment } from "../lib/trelloApi.js";
import { AtIcon, BackIcon, BellIcon, CheckIcon, SearchIcon, SpinnerIcon, UsersIcon } from "../lib/icons.jsx";
import { AvatarStack } from "../groups/components/Avatar.jsx";
import { plural } from "../groups/components/groupTheme.js";

const MAX_MESSAGE = 2000;

/**
 * Card-level popup: pick a group, add an optional message, and post a comment
 * that @mentions every member of the group (except yourself).
 */
export default function MentionPopup({ t }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [me, setMe] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [notified, setNotified] = useState(null); // array once posted

  const membersById = useMemo(() => memberMap(members), [members]);

  useEffect(() => {
    (async () => {
      try {
        const [g, m, self] = await Promise.all([loadGroups(t), getBoardMembers(t), t.member("id", "fullName", "username")]);
        setGroups(g); setMembers(m); setMe(self);
      } catch (e) {
        setError(e.message || "Couldn't load groups.");
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  useEffect(() => {
    const id = requestAnimationFrame(() => t.sizeTo && t.sizeTo("#root").catch(() => {}));
    return () => cancelAnimationFrame(id);
  }, [t, loading, selected, notified, error, query]);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()));

  async function post() {
    setPosting(true);
    setError("");
    try {
      const groupMembers = resolveMembers(selected, membersById);
      const { text, notified: toNotify } = buildCommentText({ group: selected, members: groupMembers, message, selfId: me?.id });
      const context = await t.getContext();
const cardId =
  typeof context?.card === "string"
    ? context.card
    : context?.card?.id;

if (!cardId) {
  throw new Error("Could not identify the current Trello card.");
}
      if (t.isMock) {
        // Local preview only: simulate the successful Trello comment so the
        // entire interaction can be tested without credentials.
        console.info("[Mention Groups demo] Would post to card:", cardId, text);
      } else {
        await postCardComment(t, cardId, text);
      }
      setNotified(toNotify);
    } catch (e) {
      setError(e.message === NOT_AUTHORIZED ? "Your Trello connection expired. Close this popup and click Mention Group again to reconnect." : e.message || "Couldn't post the comment.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <div className="mn mn__center"><SpinnerIcon width={22} height={22} /></div>;

  // 3) Posted
  if (notified) {
    return (
      <div className="mn mn__center">
        <div className="mn__done"><CheckIcon width={26} height={26} /></div>
        <h3 style={{ fontSize: 16 }}>Comment posted</h3>
        <p className="mn__muted">{plural(notified.length, "member")} notified in {selected.name}: {notified.map((m) => m.fullName).join(", ")}.</p>
        <button type="button" className="mg-btn mg-btn--primary mg-btn--block" onClick={() => t.closePopup()}>Done</button>
      </div>
    );
  }

  // 2) Compose
  if (selected) {
    const groupMembers = resolveMembers(selected, membersById);
    const others = groupMembers.filter(
  (m) => m.id !== me?.id && m.username
);
    return (
      <div className="mn">
        <div className="mn__head">
          <button type="button" className="mg-icon-btn" onClick={() => { setSelected(null); setError(""); }} aria-label="Back"><BackIcon width={18} height={18} /></button>
          <span className="mg-chip mn__chip">@{selected.name}</span>
        </div>
        <div className="mn__notify">
          <BellIcon width={14} height={14} />
          <span>{plural(others.length, "member")} will be notified: {others.map((m) => m.fullName).join(", ") || "nobody else"}.</span>
        </div>
        <label className="mg-label" htmlFor="mn-msg">Message (optional)</label>
        <textarea id="mn-msg" className="mn__textarea" maxLength={MAX_MESSAGE} autoFocus placeholder="Write your comment…" value={message} onChange={(e) => setMessage(e.target.value)} />
        {error && <div className="mg-error" role="alert">{error}</div>}
        <div className="mn__row">
<button
  type="button"
  className="mg-btn mg-btn--primary"
  onClick={post}
  disabled={posting}
>            {posting ? <SpinnerIcon /> : <AtIcon />} Post comment
          </button>
        </div>
      </div>
    );
  }

  // 1) Pick a group
  return (
    <div className="mn">
      {groups.length === 0 ? (
        <p className="mn__muted">No mention groups yet. Open <b>Mention Groups</b> in the board header to create one.</p>
      ) : (
        <>
          <div className="mg-input-wrap">
            <span className="mg-input-icon"><SearchIcon width={15} height={15} /></span>
            <input className="mg-input mg-input--search" autoFocus placeholder="Search groups…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search groups" />
          </div>
          <div className="mn__list">
            {filtered.map((g) => {
              const gm = resolveMembers(g, membersById);
              return (
                <button key={g.id} type="button" className="mn__item" onClick={() => setSelected(g)}>
                  <span className="mn__tile"><UsersIcon width={16} height={16} /></span>
                  <span className="mn__info">
                    <div className="mn__name">@{g.name}</div>
                    <div className="mn__count">{plural(gm.length, "member")}</div>
                  </span>
                  <AvatarStack members={gm} max={3} />
                </button>
              );
            })}
            {filtered.length === 0 && <p className="mn__muted">No groups match “{query}”.</p>}
          </div>
        </>
      )}
      {error && <div className="mg-error" role="alert">{error}</div>}
    </div>
  );
}
