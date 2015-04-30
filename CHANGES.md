##### Version 1.1 (2015-04-30)

- Added additional filtering feature for members with less than a specified point value
- Warning notice on member points for members who cannot afford all the cards they want
- Refactoring of control IDs and internal variable names
- JavaScript should no longer load cached version of the control form
- Added compatibility with UserScripts plugins

###### Known issues:

- None


----------

##### Version 1.0a4 (2015-04-23)

- Major overhaul of event handling.  Now hooks `.ajaxSend()` and `.ajaxComplete()` instead of `DOMSubtreeModified`.  This fixes issue #1 from the previous release (auto-match toggle timing).
- Automatically loads list of outgoing trades whenever `loadTableData()` is called by using `.ajaxSend()` hook.
- Added optional alert when a member has unshipped outgoing trades wants additional cards.  This indirectly fixes issue #2 from the previous release.
- Added title bar alert option.  The alert text is not currently customizable.
- Lots of miscellaneous refactoring and housekeeping.
- Removed `ISSUES.md` and combined into this document.

###### Known issues:

- None


----------


##### Version 1.0a2 (2015-04-17)

- Initial release.

###### Known issues:

1. When starting the page refresher, sometimes it doesn't correctly toggle the auto-matching option and will parse the unfiltered data instead.
2. Sending a card to a member may cause that member to no longer qualify for an alert.  