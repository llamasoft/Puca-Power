##### Version 1.2.4 (2015-05-07)

- Table reload gets postponed if something triggers the reload early (e.g. card confirmation)
- Fixed an issue where bugged members in the outgoing trade list would case the script to fail
- Infinite scrolling table no longer triggers filters/alerts while Puca Power is disabled
- Explanation of the "infinite scrolling" option clarified
- Refactoring of internal codebase
    - `ajaxSend` and `ajaxComplete` hooks rewritten
    - Status variables relocated to be closer to their relevant code
    - Standardized usage of "reload" vs "refresh"
- Updated README to include visual examples of usage methods for Chrome and Firefox
- Milestone: pucaPower.js crossed 1024 lines of code
    
----------


##### Version 1.2.2 (2015-05-05)

- Members are now grouped by ID, not display name.  Different users with the same display name are no longer considered the same person.
- Loading of outgoing trades now occurs less often.  This should improve performance.
- Removed debug line that was accidentally included
- Tweaked debug output to be more readable

----------


##### Version 1.2.1 (2015-05-04)

- Added option to enable/disable infinite scrolling
- Settings only reset when settingsVersion changes, not every program version
- Only one donation request can be displayed at a time
- Only one point warning indicator will appear per table entry

###### Known issues:

- Knapsack issue from v1.1
- Different members with the same display name are incorrectly grouped together.  This affects both bundle alerts and add-on alerts. (Thank you erickoller)

----------


##### Version 1.2 (2015-04-31)

- `.ajaxSend` and `.ajaxComplete` handlers cleaned up, comments clarified
- The infinite scroll feature now works, loading more trades as the user scrolls
- `loadOutgoingTrades` only fires on vanilla calls to `loadTableData` instead of every call (because of infinite scrolling)
- Added changelog link to version number
- Keeps track of all unique trade alerts and their values
- Added a shameless donation plug

###### Known issues:

Same as issues from v1.1

----------


##### Version 1.1 (2015-04-30)

- Added additional filtering feature for members with less than a specified point value
- Warning notice on member points for members who cannot afford all the cards they want
- Refactoring of control IDs and internal variable names
- JavaScript should no longer load cached version of the control form
- Added compatibility with UserScripts plugins
- Fixed issue where trailing front-slash in URL was breaking reload

###### Known issues:

[Semi-issue] Bundles can trigger alerts even if no possible combination of cards less than a member's current points meets the bundle threshold.  
For example, Alice has 900 points and wants two 500 point cards.  Alice will still trigger a bundle alert for a threshold of 750.  

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