
/* global TrelloPowerUp */
import { isAuthorized } from "../lib/auth.js";

const origin = window.location.origin;

const ICON = "https://mention-groups.vercel.app/icons/icon.png";

// Open the group management screen.
function openGroupsManager(t) {
  return t.popup({
    title: "Mention Groups",
    url: "./groups.html",
    height: 420,
  });
}

// Open the group picker for the current Trello card.
async function openMentionPicker(t) {
  try {
    const authorized = await isAuthorized(t);

    if (!authorized) {
      return t.popup({
        title: "Authorize Mention Groups",
        url: "./auth.html",
        height: 320,
      });
    }

    return t.popup({
      title: "Mention a Group",
      url: "./mention.html",
      height: 480,
    });
  } catch (error) {
    console.error("Mention Groups could not open:", error);
    throw error;
  }
}

TrelloPowerUp.initialize({
  "authorization-status": async function (t) {
    return {
      authorized: await isAuthorized(t),
    };
  },

  "show-authorization": function (t) {
    return t.popup({
      title: "Authorize Mention Groups",
      url: "./auth.html",
      height: 320,
    });
  },

  "show-settings": function (t) {
    return openGroupsManager(t);
  },

  "board-buttons": function () {
    return [
      {
        icon: ICON,
        text: "Mention Groups",
        callback: openGroupsManager,
      },
    ];
  },

 "card-buttons": function () {
  return [
    {
      icon: ICON,
      text: "Mention Group",
      condition: "always",
      callback: openMentionPicker,
    },
  ];
},
});
