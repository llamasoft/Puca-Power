Puca Power
=============
**Version:** 1.1 (2015-04-30)

A JavaScript utility for better trading on PucaTrade.com

### Features

- Automatic trade list refreshing
- Alerts for valuable trade bundles
- Alerts for add-on trades
- Filtering of low value cards
- Filtering members by available points


### Usage


**Copy/Paste Method:**

- Go to the [PucaTrade.com trading area](https://pucatrade.com/trades)
- Paste the following code into your browser's JavaScript console (usually Ctrl + Shift + J):  
```JavaScript
javascript:(function () { $('<script>').attr('src', 'https://llamasoft.github.io/Puca-Power/pucaPower.js?'+(new Date).getTime()).appendTo('head'); })();
```
- Use the on-screen settings to configure and run Puca Power


**Bookmarklet Method:**

- Create a new bookmark and name it "Puca Power"
- Replace the bookmark URL with code from the copy/paste method above, then save the bookmark
- Go to the [PucaTrade.com trading area](https://pucatrade.com/trades) and click the bookmark
- Use the on-screen settings to configure and run Puca Power


**UserScript Method:**

- Install a UserScript browser extension (e.g. Greasemonkey or Tampermonkey)
- Visit [this page](https://llamasoft.github.io/Puca-Power/pucaPower.js), it should ask you if you'd like to install the script
- The script will run automatically when you visit Puca Trade's trading area


### Preview

![ ](http://i.imgur.com/7jL9JlN.png)


###### Disclaimer

Puca Power **does not** automatically initiate trades.  
Puca Power **will never** automatically initiate trades.  
Requests for such functionality *will be ignored*.
