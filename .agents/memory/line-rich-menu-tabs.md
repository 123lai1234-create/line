---
name: LINE multi-tab rich menu
description: How LINE's native "多頁籤" (tabbed) rich menu switching works and the gotchas when (re)publishing it.
---

# LINE multi-tab (多頁籤) rich menu

LINE rich menus have NO built-in tabs. A "tabbed" rich menu = several separate rich
menus, each drawn with its own tab-bar image, where tapping a tab region fires a
`richmenuswitch` action that swaps the displayed menu.

**Mechanics:**
- Each tab = one full rich menu (own image + own areas).
- Tab-bar click areas use action `{ type: "richmenuswitch", richMenuAliasId, data }`.
- `richMenuAliasId` is a stable string you assign; resolved at runtime, so the alias
  need not exist when the menu is *created* — create menus first, then aliases.
- Alias API: `POST /v2/bot/richmenu/alias {richMenuAliasId, richMenuId}`;
  `GET .../alias/list`; `DELETE .../alias/{id}`.
- Set which tab shows by default with `POST /v2/bot/user/all/richmenu/{id}`.

**Teardown order matters (re-publish):** delete ALL aliases BEFORE deleting the
rich menus they point to. Deleting menus first can leave dangling aliases / fail.
**Why:** the publish script wipes and recreates everything on each `APPLY=1` run.

**How to apply:** see `scripts/src/setup-line-richmenu.ts`. Tile buttons should send
plain `message` text that `routeMessage` already recognizes (e.g. 潛水海況, 股票走勢,
選單) rather than inventing new keywords. Publishing is manual (`APPLY=1`) and is a
LIVE, destructive change to the bot's menu — render+preview the PNGs and get user
sign-off before applying.
