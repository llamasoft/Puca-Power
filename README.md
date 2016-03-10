Puca Power
=============
**Version:** 1.4.3 (2016-03-10)



#### What is Puca Power?

- Puca Power is a JavaScript utility for better trading on [PucaTrade.com](https://pucatrade.com/invite/gift/59386)
- Puca Power is *not a bot*, it's an assistant.  It won't make trades for you, only help you find them.
- Puca Power is free!


### Features

- Automatic trade list reloading
- Alerts for valuable trade bundles
- Alerts for add-on trades
- Filtering of low value cards
- Filtering members by available points


### Usage


#### Copy/Paste Method

1. Go to the PucaTrade.com trading area: https://pucatrade.com/trades
2. Open your browser's JavaScript console
    - Chrome:  <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd>
    - Firefox: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd>
3. Paste the following JavaScript into the JavaScript console, then press enter
    - [Chrome demo](http://i.imgur.com/ObMxcpL.png)
    - [Firefox demo](http://i.imgur.com/9pXv3lW.png) (if you get a warning about pasting code into the console type `allow pasting`)
```JavaScript
javascript:(function () { $('<script>').attr('src', 'https://llamasoft.github.io/Puca-Power/pucaPower.js?'+Date.now()).appendTo('head'); })();
```

Use the on-screen controls to configure and run Puca Power


#### Bookmarklet Method (Recommended)

1. Create a new bookmark and name it "Puca Power"
2. Replace the bookmark URL with the code from the copy/paste method, then save the bookmark
    - [Chrome demo](http://i.imgur.com/jMiQJAC.png)
    - [Firefox demo](http://i.imgur.com/BarNMpN.png)
3. Go to the PucaTrade.com trading area: https://pucatrade.com/trades
4. Click the bookmark you created

Use the on-screen controls to configure and run Puca Power


#### UserScript Method

1. You should only use this method if you already have a UserScript extension installed for your browser, otherwise simply use the bookmarklet method instead
    - Chrome: [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)
    - Firefox: [GreaseMonkey](https://addons.mozilla.org/en-Us/firefox/addon/greasemonkey/)
2. Install the following script: https://llamasoft.github.io/Puca-Power/pucaPower.js
3. Puca Power should automatically run when you visit the PucaTrade.com trading area


### Preview

![ ](http://i.imgur.com/P6qoD3p.png)


###### Disclaimer

This software is provided on an "as is" basis and without warranty, either express or implied, including, without limitation, the warranties of non-infringement, merchantability, or fitness for a particular purpose.  
Please do not use or modify Puca Power in such a way that it violates the PucaTrade.com [Terms of Service](https://pucatrade.com/terms).
