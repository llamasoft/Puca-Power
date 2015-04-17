
##### Version 1.0a2 (2015-04-17):

1. When starting the page refresher, sometimes it doesn't correctly toggle the auto-matching option and will parse the unfiltered data instead.
2. Sending a card to a member may cause that member to no longer qualify for an alert.  

###### Notes:

Issue #1 is sporradic at best and difficult to reproduce.  I've increased the delay to wait for the table data to finish loading.  Hopefully that fixes it.

Issue #2 may be a non-issue, but I'd eventually like to address it.  
Ideally, I'd like to prevent the card sending dialog from calling `loadTableData()` on closure but as of yet I've been unable to figure out how.
