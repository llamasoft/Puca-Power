##### Version 1.4.4 (2016-05-11)

- Hopefully fix hang that some users with many pages of trades have been experiencing
- Prevent PucaTrade from initiating page reloads while Puca Power is managing reloads
  - This should prevent forced refreshes after sending cards and changing sort order
- Tweak UserScript integration to use metadata for script URL instead of hard-coding it

----------


##### Version 1.4.3 (2016-03-08)

- Reduced CPU load during refresh by deferring table parsing
- Reduced memory footprint by removing DOM elements instead of hiding
- Reduced memory footprint by clearing variables at end of refresh cycle
- Fixed minor "knapsack" algorithm bug
- Added `pucaPower.maxPages` setting (no GUI setting yet), set default back down to 10
- Fix card sending regression

----------


##### Version 1.4.2 (2016-03-07)

- Duplicate trade offers are now removed and no longer count towards bundles
- Added option to only alert on new or expanding alerts
- Removed title change option (to make room for new option)
- Lowered threshold of trade page fetching from 200 to 175
- Capped trade page fetching to 15 pages (about 4.5k offers)
  - Some users reported infinite page fetching; this is simply a quick-fix until I get things sorted out

----------


##### Version 1.4.0 (2016-03-01)

- Now loads all pages of trades before checking for alerts and applying filtering
  - Because all pages of trades are loaded in advance, the infinite scroll option has been removed entirely
- Clicking an alert entry will snap that trade into view
  - Pressing back or clicking the top-right arrows will return to the top of the page
- Fixed the "knapsack" issue where no combinations of a member's trades meets the trade bundle threshold
- Warning icons now mean that a member cannot afford all their trades, but some subset meets the bundle threshold
- UserScript method now works (kinda)
- New embedding method no longer requires a pre-existing div
- Sets without a set symbol no longer result in a parsing error

----------


##### Version 1.3.0 (2015-10-27)

- Added notification option.  The notification is not currently customizable.
- Milestone: pucaPower.js contributed to by multiple developers
- Settings structure version updated to reflect new desktop notification option
- When a settings version change is detected, the script will attempt to merge new values instead of reverting to defaults
- Better URL checking to verify that the script is only run on the trades page
- Updated UserScript headers to delay first run until (hopefully) after infinite table features load
- Updated UserScript version header to (hopefully) trigger an update

----------


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
