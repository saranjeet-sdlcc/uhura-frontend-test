// src/utils/normalizeGroupMessage.js
export function pickLocalized(doc, viewerId) {
  // Prefer per-recipient localization if server already included it (live)
  if (doc?.language) return { content: doc.content ?? "", language: doc.language };

  // For history (DB docs), pick viewer's entry in the map
  const lv = doc?.languageVersions?.[viewerId]
    || (typeof doc?.languageVersions?.get === "function" ? doc.languageVersions.get(viewerId) : null);

  if (lv) return { content: lv.content ?? (doc.content ?? ""), language: lv.language ?? "none" };

  // Fallback to original
  return { content: doc.content ?? "", language: "none" };
}

export function normalizeGroupForUI(doc, viewerId) {
  const { content, language } = pickLocalized(doc, viewerId);

  // also try to localize the reply preview (if present in DB history)
  let replyTo = doc.replyTo;
  if (doc.replyTo && doc.replyTo.messageId && doc.replyTo.content == null) {
    // if you ever hydrate originalRef separately, you can plug it here
    replyTo = { ...doc.replyTo, content: doc.replyTo.content ?? "" };
  }

  return {
    ...doc,
    isGroup: true,
    content,
    language,
    replyTo,
  };
}
