/*jslint browser: true, devel: true, plusplus: true, sloppy: true, unparam: true, vars: true, white: true */
/* global loadTableData, $, _gaq */

// ==UserScript==
// @name            Puca Power
// @version         1.2.4
// @namespace       https://github.com/llamasoft/Puca-Power
// @description     A JavaScript utility for better trading on PucaTrade.com
// @downloadURL     https://llamasoft.github.io/Puca-Power/pucaPower.js
// @grant           none
// @include         https://pucatrade.com/trades
// @include         https://pucatrade.com/trades/
// @require         https://pucatrade.com/js/libs/jquery.1.10.2.min.js
// @require         https://pucatrade.com/js/infinite.tables.js
// ==/UserScript==

var pucaPower = {

    /* ===== INTERNAL VARIABLES ===== */

    version: 'v1.2.4',
    formUrl: 'https://llamasoft.github.io/Puca-Power/controls.html',


    // Default values for internal settings
    // If you change this structure, you need to update the following:
    //   loadDefaultSettings
    //   applySettingsToPage
    //   loadSettingsFromPage
    //   setupListeners
    //   controls.html
    defaults: {
        // Reload the trade table after reloadInterval seconds since the last reload
        // NOTE: This may be different than "reload every reloadInterval seconds" because
        //   there are actions that reload the table that are beyond our control
        //   (e.g. sending a card, changing country filters, searching for a card)
        reloadInterval: 60,

        disableInfScroll: true,

        alert: {
            onBundle: true,
            bundleThreshold: 500,
            colorizeBundleRows: true,
            colorizeBundleColor: '#CCFF99',

            onOutgoing: true,
            colorizeOutgoingRows: true,
            colorizeOutgoingColor: '#FFEBB5',

            playSound: true,
            soundFile: 'https://llamasoft.github.io/Puca-Power/alert.mp3',

            changeTitle: true,
            titleText: '\u2605 Trade alert! \u2605'
        },

        filter: {
            cardsByValue: false,
            cardsMinValue: 50,
            membersByPoints: false,
            membersMinPoints: 400
        }
    },
    settingsVersion: '1.2.1',

    // Settings structures
    reloadInterval: null,
    alert: null,
    filter: null,

    // Selector string to pull the trade table rows
    tableStr: 'table.infinite tbody',
    tableRowStr: 'table.infinite tbody tr[id^="uc_"]',

    // Map of asynchronous events that we may need to wait on
    events: {
        tableLoadComplete: false,
        outgoingLoadComplete: false
    },

    // Array of objects of the loaded trade data
    // Each entry is {dom, tradeID, memberID, memberName, memberPts, country, cardName, cardPts}
    tableData: [],

    // Object of card information
    // Each entry is {cardSet, cardName, cardPts}, key is trade ID
    cardData: {},

    // Object of objects of the table data grouped by memberID
    // Each object has:
    //   memberName - The displayed name of the member
    //   memberPts - The number of points the user has available
    //   country - The country associated with the member
    //   cardQty - The number of cards the user wants from you
    //   tradeIDs - The trade IDs and values associated with the cards they want
    //   totalCardPts - The sum value of all the cards the user wants from you
    //   hasAlert - A flag that's true if the user has some kind of alert (see below)
    //   hasBundleAlert - Flag the notes if the member qualifies as a trade bundle
    //   hasOutgoingAlert - Flag that notes if the member has unsent outgoing trades
    memberData: {},

    // Object of objects of the outgoing (unshipped) trades
    // Each object is {memberName, cardQty, totalCardPts}, key is memberID
    outgoingTrades: {},

    // Object of trade IDs and trade value, key is trade ID
    seenAlerts: {},
    sentTrades: 0,

    // Enable debug messages
    // debugLevel  0 - Errors and trade alerts
    // debugLevel  1 - Important messages only
    // debugLevel  2 - Semi-important messages
    // debugLevel  3 - Informational messages
    // debugLevel >3 - Probably noise
    debugLevel: 0,
    debug: function (msgLevel, msg) {
        var padding;

        if ( msgLevel <= this.debugLevel ) {
            // String.prototype.repeat is proposed, but not always supported
            padding = new Array( Math.min(msgLevel, 10) + 1 ).join('  ');

            console.log(padding + '[' + msgLevel + '] - ' + msg);
        }
    },



    /* ===== SETTINGS FUNCTIONS ===== */

    // Reset all settings to default values
    // Calls applySettingsToPage()
    loadDefaultSettings: function () {
        this.debug(2, 'Resetting settings to default values');

        this.reloadInterval   = this.defaults.reloadInterval;
        this.disableInfScroll = this.defaults.disableInfScroll;
        this.alert  = this.defaults.alert;
        this.filter = this.defaults.filter;

        this.applySettingsToPage();
    },


    // Clear local storage settings
    clearLocalSettings: function () {
        this.debug(2, 'Deleting local settings');
        delete localStorage.pucaPowerSettings;
    },

    // Save current settings to local storage
    saveSettingsToLocal: function () {
        if ( Storage === undefined ) {
            this.debug(2, 'No local storage, cannot save settings');
            this.addNote('Your settings were applied but could not be saved locally', 'text-warning');
            return;
        }

        this.debug(2, 'Saving settings to local storage');

        localStorage.pucaPowerSettings = JSON.stringify({
            version:          this.version,
            settingsVersion:  this.settingsVersion,
            reloadInterval:   this.reloadInterval,
            disableInfScroll: this.disableInfScroll,
            alert:      this.alert,
            filter:     this.filter,
            debugLevel: this.debugLevel
        });

        this.addNote('Your settings were saved and applied', 'text-success');
    },

    // Load settings from local storage
    // Calls clearLocalSettings() on error
    loadSettingsFromLocal: function () {
        if ( Storage === undefined ) {
            this.debug(2, 'No local storage, cannot load settings');
            return;
        }

        if ( !localStorage.pucaPowerSettings ) {
            this.debug(2, 'No local settings found, skipping load');
            return;
        }

        this.debug(3, 'Loading settings from local storage');
        var settings = JSON.parse(localStorage.pucaPowerSettings);

        if ( !settings ) {
            this.debug(1, 'Failed to parse settings, purging settings');
            this.clearLocalSettings();
            return;
        }

        if ( settings.settingsVersion !== this.settingsVersion ) {
            this.debug(1, 'Settings version mismatch, purging settings');
            this.clearLocalSettings();
            return;
        }

        this.reloadInterval   = settings.reloadInterval;
        this.disableInfScroll = settings.disableInfScroll;
        this.alert      = settings.alert;
        this.filter     = settings.filter;
        this.debugLevel = settings.debugLevel;
    },


    // Load settings from controls on the page
    // Implicitly calls applySettingsToPage()
    loadSettingsFromPage: function () {
        this.debug(4, 'Loading settings from page');

        var safeParse = function (value, nanFallback, negFallback) {
            var temp = parseInt(value, 10);
            if ( isNaN(temp) ) { temp = nanFallback; }
            if ( temp <= 0 )   { temp = negFallback; }
            return temp;
        };

        this.reloadInterval = safeParse(
            $('input#reloadInterval').val(),
            this.reloadInterval,
            this.defaults.reloadInterval
        );

        // Don't be a menace
        if ( this.reloadInterval < 10 ) { this.reloadInterval = 10; }

        this.disableInfScroll = $('input#disableInfScroll').prop('checked');

        this.alert = {
            onBundle: $('input#alertOnBundle').prop('checked'),
            bundleThreshold:
                safeParse(
                    $('input#alertBundleThreshold').val(),
                    this.alert.bundleThreshold,
                    this.defaults.alert.bundleThreshold
                ),
            colorizeBundleRows: $('input#alertColorizeBundleRows').prop('checked'),
            colorizeBundleColor: $('input#alertColorizeBundleColor').val(),

            onOutgoing: $('input#alertOnOutgoing').prop('checked'),
            colorizeOutgoingRows: $('input#alertColorizeOutgoingRows').prop('checked'),
            colorizeOutgoingColor: $('input#alertColorizeOutgoingColor').val(),

            playSound: $('input#alertPlaySound').prop('checked'),
            soundFile: $('input#alertSoundFile').val().trim(),

            changeTitle: $('input#alertChangeTitle').prop('checked'),
            titleText: this.defaults.alert.titleText
        };

        this.filter = {
            cardsByValue: $('input#filterCardsByValue').prop('checked'),
            cardsMinValue:
                safeParse(
                    $('input#filterCardsMinValue').val(),
                    this.filter.cardsMinValue,
                    this.defaults.filter.cardsMinValue
                ),
            membersByPoints: $('input#filterMembersByPoints').prop('checked'),
            membersMinPoints:
                safeParse(
                    $('input#filterMembersMinPoints').val(),
                    this.filter.membersMinPoints,
                    this.defaults.filter.membersMinPoints
                )
        };

        // In case safeParse() changed anything
        this.applySettingsToPage();
    },

    // Update HTML inputs to match current settings
    // Calls updatePageState() on completion
    applySettingsToPage: function () {
        this.debug(4, 'Applying active settings to page');

        $('input#reloadInterval').val(this.reloadInterval);

        $('input#disableInfScroll').prop('checked', this.disableInfScroll);

        // Trade bundle settings
        $('input#alertOnBundle').prop('checked', this.alert.onBundle);
        $('input#alertBundleThreshold').val(this.alert.bundleThreshold);
        $('input#alertColorizeBundleRows').prop('checked', this.alert.colorizeBundleRows);
        $('input#alertColorizeBundleColor').val(this.alert.colorizeBundleColor);

        // Outgoing trades settings
        $('input#alertOnOutgoing').prop('checked', this.alert.onOutgoing);
        $('input#alertColorizeOutgoingRows').prop('checked', this.alert.colorizeOutgoingRows);
        $('input#alertColorizeOutgoingColor').val(this.alert.colorizeOutgoingColor);

        // Alert settings
        $('input#alertPlaySound').prop('checked', this.alert.playSound);
        $('audio#alertSound').attr('src', this.alert.soundFile);
        $('input#alertSoundFile').val(this.alert.soundFile);
        $('input#alertChangeTitle').prop('checked', this.alert.changeTitle);

        // Filter settings
        $('input#filterCardsByValue').prop('checked', this.filter.cardsByValue);
        $('input#filterCardsMinValue').val(this.filter.cardsMinValue);
        $('input#filterMembersByPoints').prop('checked', this.filter.membersByPoints);
        $('input#filterMembersMinPoints').val(this.filter.membersMinPoints);


        this.updatePageState();
    },

    // Enable or disable inputs based on current options
    // Called from applySettingsToPage()
    updatePageState: function () {
        var isChecked;
        var isEnabled;

        // Alert on bundle checkbox is connected to its colorize checkboxes
        isChecked = $('input#alertOnBundle').prop('checked');
        $('input#alertBundleThreshold').prop('disabled', !isChecked);
        $('input#alertColorizeBundleRows').prop('disabled', !isChecked);
        $('input#alertColorizeBundleColor').prop('disabled', !isChecked);

        // Colorize bundle rows checkbox is connected to the color picker
        isChecked =  $('input#alertColorizeBundleRows').prop('checked');
        isEnabled = !$('input#alertColorizeBundleRows').prop('disabled');
        $('input#alertColorizeBundleColor').prop('disabled', !(isEnabled && isChecked));


        // Alert on outgoing trades checkbox is connected to its colorize checkboxes
        isChecked = $('input#alertOnOutgoing').prop('checked');
        $('input#alertColorizeOutgoingRows').prop('disabled', !isChecked);
        $('input#alertColorizeOutgoingColor').prop('disabled', !isChecked);

        // Colorize outgoing rows checkbox is connected to the color picker
        isChecked =  $('input#alertColorizeOutgoingRows').prop('checked');
        isEnabled = !$('input#alertColorizeOutgoingRows').prop('disabled');
        $('input#alertColorizeOutgoingColor').prop('disabled', !(isEnabled && isChecked));


        // The play alert sound checkbox is connected to the sound file input
        isChecked = $('input#alertPlaySound').prop('checked');
        $('input#alertSoundFile').prop('disabled', !isChecked);


        // The card value filter checkbox is connected to the minimum card value input
        isChecked = $('input#filterCardsByValue').prop('checked');
        $('input#filterCardsMinValue').prop('disabled', !isChecked);

        // The member filter checkbox is connected to the minimum member points input
        isChecked = $('input#filterMembersByPoints').prop('checked');
        $('input#filterMembersMinPoints').prop('disabled', !isChecked);
    },



    /* ===== TABLE PARSING FUNCTIONS ===== */

    // Load the trade table data into manageable structures (tableData and memberData)
    // This is usually called after loadTableData() completes
    parseTradeTable: function () {
        // Don't bother parsing the data if auto-match is turned off
        if ( !$('input.niceToggle.intersect').prop('checked') ) {
            this.debug(2, 'Skipping trade table parse, auto-match is off');
            return;
        }

        this.debug(2, 'Parsing trade table data');

        this.tableData = [];
        this.cardData = {};
        this.memberData = {};

        // Parse all rows, hidden or not (scrolling may have added more entries)
        var tableRows = $(this.tableRowStr);

        var i;
        var tradeID;
        var curRow, curFields;
        var cardSet, cardName, cardPts;
        var memberID, memberName, memberPts;
        var country;

        // For each row in the trade table
        for (i = 0; i < tableRows.length; i++) {
            curRow = $(tableRows).eq(i);
            curFields = $(curRow).find('td');

            // Extract the relevant table fields
            tradeID  = $(curRow).attr('id');
            cardSet  = $(curFields).eq(0).find('img.iconExpansion').attr('title').trim();
            cardName = $(curFields).eq(1).text().trim();
            cardPts  = parseInt( $(curFields).eq(2).text(), 10 );

            // The member field can have multiple <a> elements, but the last one is always the profile link
            // The other <a> elements are usually the membership level and upgrade link
            // The past part of the profile URL is the member ID; it is unique, memberName isn't
            memberID   = $(curFields).eq(4).find('a').last().attr('href').split('/').pop();
            memberName = $(curFields).eq(4).text().trim();
            memberPts  = parseInt( $(curFields).eq(5).text(), 10 );

            // Pulling from curRow, not curFields because the country column position
            //   depends on membership level as rare-level users have an extra column
            country = $(curRow).find('i.flag').attr('title').trim();

            // Data per row
            this.tableData.push({
                dom:        curRow,
                tradeID:    tradeID,
                memberID:   memberID,
                memberName: memberName,
                memberPts:  memberPts,
                country:    country,
                cardName:   cardName,
                cardPts:    cardPts
            });

            // Data per card
            this.cardData[tradeID] = {
                cardSet:  cardSet,
                cardName: cardName,
                cardPts:  cardPts
            };

            // Data per member
            if ( !this.memberData[memberID] ) {
                // Make a new entry
                this.memberData[memberID] = {
                    memberName: memberName,
                    memberPts: memberPts,
                    country: country,
                    cardQty: 0,
                    tradeIDs: {},
                    totalCardPts: 0,
                    hasAlert: false,
                    hasBundleAlert: false,
                    hasOutgoingAlert: false
                };

            }
            
            // Now that we're certain the entry exists, update the data
            this.memberData[memberID].cardQty++;
            this.memberData[memberID].totalCardPts += cardPts;
            this.memberData[memberID].tradeIDs[tradeID] = cardPts;
        }
    },


    // Loads the and parses the outgoing trade information
    //   into a manageable structure (outgoingTrades)
    lastOutgoingLoad: 0,
    loadOutgoingTrades: function (force) {
        this.debug(2, 'Fetching outgoing trades');

        // Only run if forced or at least 120 seconds since the last run
        if ( force || this.time() - this.lastOutgoingLoad < 120 * 1000 ) { return; }


        this.events.outgoingLoadComplete = false;
        this.lastOutgoingLoad = this.time();


        // Initiate an AJAX request to get the outgoing trades
        // When it returns, parse the outgoing trades table then
        //   call reloadComplete() to parse/filter trades
        $.get('/trades/active', function (data) {
            this.debug(3, 'Got outgoing trades');

            var i;
            var tableRows = $(data).find('table.datatable tbody tr[id^="user_card"]:contains("Unshipped")');
            var curRow, curFields;

            var memberID, memberName;
            var cardPts;

            this.outgoingTrades = {};

            // For each row of unshipped trades
            for (i = 0; i < tableRows.length; i++) {
                curRow = $(tableRows).eq(i);
                curFields = $(curRow).find('td');

                cardPts = parseInt( $(curFields).eq(3).text(), 10 );

                // Some member entries can become bugged and somehow lack a profile link
                // We don't care why they're bugged, but trying to parse them would be dumb
                if ( $(curFields).eq(6).find('a.trader').length < 1 ) {
                    this.debug(0, 'Warning: bugged outgoing trade detected, html = '
                                  + $(curFields).eq(6).html().replace(/\s+/g, ' '));
                    continue;
                }

                memberID = $(curFields).eq(6).find('a.trader').attr('href').split('/').pop();

                // Thank you StackOverflow! http://stackoverflow.com/a/8851526/477563
                memberName = $(curFields).eq(6).find('a.trader')
                             .children().remove().end().text().trim();

                if ( !this.outgoingTrades[memberID] ) {
                    this.outgoingTrades[memberID] = {
                        memberName: memberName,
                        cardQty: 1,
                        totalCardPts: cardPts
                    };

                } else {
                    this.outgoingTrades[memberID].cardQty++;
                    this.outgoingTrades[memberID].totalCardPts += cardPts;
                }
            }

            this.events.outgoingLoadComplete = true;
            this.reloadComplete();
        }.bind(this));
    },



    /* ===== ALERT/NOTIFICATION FUNCTIONS ===== */

    clearAllNotes: function () {
        $('li.noteItem:not(#defaultNote)').remove();
        $('li#defaultNote').show();
    },

    getNotes: function () {
        return $('li.noteItem');
    },

    addNote: function (alertText, alertClass) {
        this.debug(4, 'Adding alert item: ' + alertText);

        $('li#defaultNote').hide();
        $('ul#noteList').append( $('<li class="noteItem">').html(alertText).addClass(alertClass) );
    },

    titleAlertTimeout: null,
    setTitleAlert: function (msg, delay) {
        if ( this.titleAlertTimeout ) { return; }
        if ( delay === undefined ) { delay = 5000; }

        if ( this.alert.changeTitle ) {
            this.origTitle = document.title;
            document.title = msg;

            this.titleAlertTimeout = setTimeout(this.removeTitleAlert.bind(this), delay);
        }
    },

    removeTitleAlert: function () {
        this.titleAlertTimeout = null;
        document.title = this.origTitle;
    },

    hasPlayedSound: true,
    playAlertSound: function () {
        if ( this.alert.playSound && !this.hasPlayedSound ) {
            $('audio#alertSound').trigger('play');
            this.hasPlayedSound = true;
        }
    },

    checkForAlerts: function () {
        this.debug(2, 'Checking for alerts');

        var i;
        var pendingAlerts = [];
        var curAlert = {}; // { msg, style, weight }

        var memberID, memberName, memberPts;
        var cardQty, totalCardPts;
        var country;
        var tradeValue;

        var rowColor;


        // First iterate the individual members by ID
        for (i in this.memberData) {
            if ( !this.memberData.hasOwnProperty(i) ) { continue; }

            memberID     = i;
            memberName   = this.memberData[i].memberName;
            memberPts    = this.memberData[i].memberPts;
            cardQty      = this.memberData[i].cardQty;
            totalCardPts = this.memberData[i].totalCardPts;
            country      = this.memberData[i].country;


            // The bundle is only worth what the member can actually pay for
            tradeValue = Math.min(totalCardPts, memberPts);
            curAlert = {};


            // Does this qualify as a bundle alert?
            if ( this.alert.onBundle && tradeValue >= this.alert.bundleThreshold ) {
                this.memberData[i].hasAlert = true;
                this.memberData[i].hasBundleAlert = true;

                // Queue the alert
                // If the trade value is limited by the user's points, mark the entry
                curAlert = {
                    msg: '<strong>' + memberName + ' (' + memberPts + ' points)</strong> wants '
                        + cardQty + ' cards for <strong>' + totalCardPts + ' points</strong>',
                    style: (totalCardPts > memberPts ? 'text-warning' : ''),
                    weight: tradeValue
                };
            }


            // Does this member have outgoing trades?
            // If a user qualifies for bundle and outgoing alerts, the outgoing always has higher priority.
            if ( this.alert.onOutgoing && this.outgoingTrades[memberID] !== undefined ) {
                this.memberData[i].hasAlert = true;
                this.memberData[i].hasOutgoingAlert = true;

                // The value is increased by how much we're already sending them
                tradeValue += this.outgoingTrades[memberID].totalCardPts;

                curAlert = {
                    msg: '<strong>' + memberName + ' (' + memberPts + ' points)</strong> '
                        + 'has outgoing trades and wants ' + cardQty + ' more cards for '
                        + '<strong>' + totalCardPts + ' points</strong>',
                    style: (totalCardPts > memberPts ? 'text-warning' : ''),
                    weight: tradeValue
                };
            }


            if ( curAlert.msg !== undefined ) {
                pendingAlerts.push(curAlert);
                this.debug(0, 'Alert! ' + curAlert.msg);
            }
        }


        // Iterate the table elements and colorize alerts
        for (i = 0; i < this.tableData.length; i++) {
            memberID = this.tableData[i].memberID;
            rowColor = null;

            if ( this.memberData[memberID].hasAlert ) {
                // Reveal the row if previously hidden by filtering
                $(this.tableData[i].dom).show();
                $(this.tableData[i].dom).data('hasAlert', true);

                this.seenAlerts[ this.tableData[i].tradeID ] = this.tableData[i].cardPts;


                // Colorize if part of a bundle
                if ( this.alert.colorizeBundleRows && this.memberData[memberID].hasBundleAlert ) {
                    rowColor = this.alert.colorizeBundleColor;
                }

                // Colorize if has outgoing trades (will override bundle)
                if ( this.alert.colorizeOutgoingRows && this.memberData[memberID].hasOutgoingAlert ) {
                    rowColor = this.alert.colorizeOutgoingColor;
                }

                // If we have a pending color, apply it.
                if ( rowColor !== null ) {
                    $(this.tableData[i].dom).find('td').css('background-color', rowColor);
                }


                // Put a mark next to the member's points if they can't afford all their wants
                if ( this.memberData[memberID].memberPts < this.memberData[memberID].totalCardPts ) {
                    if ( !$(this.tableData[i].dom).data('hasPointWarning') ) {
                        $(this.tableData[i].dom).data('hasPointWarning', true);
                        $(this.tableData[i].dom).find('td.points').prepend('<i class="icon-warning-sign"></i>&nbsp;&nbsp;');
                        $(this.tableData[i].dom).find('td.points').append('&nbsp;&nbsp;<i class="icon-warning-sign"></i>');
                    }
                }
            }
        }


        if ( pendingAlerts.length > 0 ) {
            this.playAlertSound();
            this.setTitleAlert(this.alert.titleText);
            window._gaq.push(['pucaPowerGA._trackEvent', 'PucaPower', 'Alert']);
        }

        // Sort the alerts by weight
        pendingAlerts.sort(function (a, b) { return (b.weight - a.weight); });

        // Display the alerts, highest weight first
        for (i = 0; i < pendingAlerts.length; i++) {
            this.addNote(pendingAlerts[i].msg, pendingAlerts[i].style);
        }
    },



    /* ===== MISC/UTILITY FUNCTIONS ===== */

    donationRequest: function () {
        // If a donation request already exists, don't make another
        if ( $('li.donationRequest').length > 0 ) { return; }

        var paypal    = '<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=5GF3TD343BS4A">PayPal</a>';
        var bitcoin   = '<a href="https://www.coinbase.com/checkouts/630f3600438a42cce9fc9aba8b23f744">Bitcoin</a>';
        var pucatrade = '<a href="https://pucatrade.com/profiles/show/59386">Puca Trade</a>';


        if ( this.sentTrades > 0 ) {
            this.addNote('Puca Power has helped you send <strong>' + this.sentTrades + ' trades</strong> this session.');
        }

        // The sum of all unique alerted trades
        var alertPoints = Object.keys(this.seenAlerts).reduce(function (sum, cur) { return sum + this.seenAlerts[cur]; }.bind(this), 0);
        if ( alertPoints > 0 ) {
            this.addNote('Puca Power has alerted you to <strong>' + alertPoints + ' points</strong> in trades this session.');
        }

        this.addNote('<strong>Do you like Puca Power?</strong> <i class="icon-heart"></i> '
                   + 'Consider donating via ' + paypal + ', ' + bitcoin + ', or ' + pucatrade + '!',
                     'donationRequest');
    },

    news: function () {
        // Placeholder
        // In case I need to have a news alert at a later date
    },

    knapsack: function (items, knapsackSize) {
        // TODO: return the highest value combination of items
        //   that's less than or equal to knapsackSize

        // This will eventually replace the "tradeValue = Math.min(totalCardPts, memberPts);"
        //   logic from checkForAlerts()
    },

    // Returns the current time in milliseconds since epoch
    time: function () { return (new Date()).getTime(); },

    // Enables the auto-match feature of the trade table
    // This is required if we want any of the alerts to be valid
    enableAutoMatch: function () {
        if ( !$('input.niceToggle.intersect').prop('checked') ) {
            this.debug(2, 'Enabling auto-match');
            $('input.niceToggle.intersect').prop('checked', true);
            $('label.niceToggle.intersect').addClass('on');

            // lastVars may or may not be defined yet
            window.lastVars = $.extend({ intersect: true }, window.lastVars);
        }
    },



    /* ===== FILTER FUNCTIONS ===== */

    filterTrades: function () {
        this.debug(2, 'Filtering trades');
        var i;
        var filterQty = 0;
        var memberID, memberName, memberPts, hasAlert;
        var cardName, cardPts;
        var matchedFilter;

        for (i = 0; i < this.tableData.length; i++) {
            memberID   = this.tableData[i].memberID;
            memberName = this.tableData[i].memberName;
            memberPts  = this.memberData[memberID].memberPts;
            hasAlert   = this.memberData[memberID].hasAlert;

            cardName = this.tableData[i].cardName;
            cardPts  = this.tableData[i].cardPts;

            matchedFilter = false;

            // Skip entries that have pending alerts
            if ( hasAlert ) { continue; }


            // Filter cards by value
            if ( this.filter.cardsByValue && cardPts < this.filter.cardsMinValue ) {
                this.debug(5, 'Filtering trade: ' + cardName + ' (' + cardPts + ')');
                matchedFilter = true;

            // Filter members by points
            } else if ( this.filter.membersByPoints && memberPts < this.filter.membersMinPoints ) {
                this.debug(4, 'Filtering member: ' + memberName + ' (' + memberPts + ')');
                matchedFilter = true;
            }


            // If we found at least one filter criteria, hide the trade offer
            if ( matchedFilter ) {
                filterQty++;
                $(this.tableData[i].dom).hide();
            }
        }

        if ( filterQty > 0 ) {
            this.addNote('Filtered ' + filterQty + ' trades', 'muted');
        }

        // Update the "Total" label on the table
        $('p#total').text('Total: ' + (this.tableData.length - filterQty));
    },



    /* === DRIVER FUNCTIONS === */

    // Initiate trade data reload
    // This kicks off the loadTableData() function which
    //   kicks off loadOutgoingTrades() via .ajaxSend hook if necessary
    // Once all the async calls finish, they each attempt
    //   to call reloadComplete() but only the final call succeeds
    running: false,
    go: function () {

        // If a fancybox window is open, stall the reload
        // There's no point reloading the list if the user is currently confirming a trade
        if ( $('.fancybox-inner').length > 0 ) {
            this.debug(3, 'Stalling reload');
            this.reloadTimeout = setTimeout(this.go.bind(this), 1000);
            return;
        }

        this.debug(1, 'Reloading table data');

        // Reload settings in case something changed
        this.loadSettingsFromPage();

        this.running = true;
        this.reloadTimeout = null;
        this.hasPlayedSound = false;

        $('button#start').removeClass('btn-success');
        $('button#start').prop('disabled', true);

        $('button#stop').addClass('btn-danger');
        $('button#stop').prop('disabled', false);

        // Auto-match must be on, otherwise things get weird with alerts and filtering.
        this.enableAutoMatch();


        // Optionally enable the infinite scroll feature while the reloader is active
        if ( !this.disableInfScroll ) {
            $(this.tableStr).infinitescroll('resume');
        }


        this.events.tableLoadComplete = false;
        window.loadTableData();
        window._gaq.push(['pucaPowerGA._trackEvent', 'PucaPower', 'Reload']);
    },

    // The trade table finished updating and we can now load the data
    // This can also be triggered by the infinite table adding an extra page
    reloadComplete: function () {
        // We will be called multiple times from the .ajaxComplete handler
        //   but we will only run once (when all of the events are ready)
        if ( !this.events.tableLoadComplete || !this.events.outgoingLoadComplete ) { return; }

        // If we're not running, don't do anything
        if ( !this.running ) { return; }


        this.clearAllNotes();
        this.checkForAlerts();
        this.filterTrades();

        // A reload is automatically queued when a vanilla table reload starts,
        //   see .ajaxSend handler in setupListeners()
        this.queueReload();
    },

    // Queues or requeues a table reload
    reloadTimeout: null,
    queueReload: function () {
        // If we're not running, don't queue a reload
        if ( !this.running ) { return; }

        // If a reload is already pending, cancel it so we can reschedule it
        this.cancelReload();

        // If the reloadInterval is sane, queue up a reload
        if ( this.reloadInterval >= 10 ) {
            this.reloadTimeout = setTimeout(this.go.bind(this), this.reloadInterval * 1000);
            this.debug(4, 'Reload queued');
        }
    },

    // Cancels a pending reload
    cancelReload: function () {
        // If a reload is already pending, cancel it so we can reschedule it
        if ( this.reloadTimeout ) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = null;
            this.debug(4, 'Reload canceled');
        }
    },

    // Stop the reload, clear the reload handle
    stop: function () {
        this.debug(1, 'Stopping table reload');

        this.running    = false;
        this.hasAlerted = true;

        $('button#start').addClass('btn-success');
        $('button#start').prop('disabled', false);

        $('button#stop').removeClass('btn-danger');
        $('button#stop').prop('disabled', true);

        // Disable the infinite scrolling unless the reloader is active
        $(this.tableStr).infinitescroll('pause');

        // If we have a pending reload, cancel it
        this.cancelReload();
    },



    /* === SETUP FUNCTIONS === */

    // Responsible for setting up event listeners and handlers
    setupListeners: function () {

        // Hook all AJAX requests
        // This lets us detect certain activities and react to them
        $(document).ajaxSend(function (e, xhr, settings) {
            var cardPts = 0;

            // Remove url parameters (after "?"), then remove trailing frontslashes
            var url = settings.url.split('?')[0].replace(/\/+$/, '');
            this.debug(4, '.ajaxSend - ' + url);

            // Suppress fancybox loading animation
            $.fancybox.hideLoading();


            // If we're not running, we don't care about hooking events
            // But hey, at least the fancybox loading animation got suppressed
            if ( !this.running ) { return; }


            // Determine the AJAX request by the URL it's fetching
            if ( url.indexOf('/trades/active') !== -1 ) {
                // This is us loading the outgoing trades
                // No action is required

            } else if ( url.search(/^\/trades\/[A-Za-z_\/]+/) !== -1 ) {
                // This is a call to something under /trades/ that isn't a trade table fetch
                // It could be a card confirmation dialog, a lock release,
                //   or the user committing to send a card

                // If the call is a card confirmation, we need to reload
                //   the outgoing trades at the next available opportunity
                // (Which should be pretty soon, closing the dialog triggers a table reload)
                if ( url.indexOf('/trades/confirm') !== -1 ) {
                    this.debug(3, 'Resetting outgoing trade reload timer, user confirmed a trade');
                    this.lastOutgoingLoad = 0;
                    this.sentTrades++;

                    // Get the card points for analytic purposes
                    cardPts = this.cardData['uc_' + url.split('/').pop()].cardPts || 0;
                    window._gaq.push(['pucaPowerGA._trackEvent', 'PucaPower', 'Send', 'Card Points', cardPts]);
                }

            } else {
                // We've ruled out everything else; this is a trade table fetch
                // It can come in three forms
                //   /trades or /trades/ -> vanilla reload, getting the first page of trades
                //   /trades/[NUM]       -> fetching a specific page of trades

                if ( url.search(/^\/trades\/\d+/) !== -1 ) {
                    // Fetching a specific page of trades
                    // No action required

                } else {
                    // Vanilla reload
                    // Load the outgoing trades if required
                    if ( this.time() - this.lastOutgoingLoad > 120 * 1000 ) {
                        this.loadOutgoingTrades();
                    }
                }
            }

        }.bind(this));


        // Hook all AJAX completions
        $(document).ajaxComplete(function (e, xhr, settings) {

            // Remove url parameters (after "?"), then remove trailing frontslashes
            var url = settings.url.split('?')[0].replace(/\/+$/, '');
            this.debug(4, '.ajaxComplete - ' + url);

            // If we're not running, we don't need to handle anything
            if ( !this.running ) { return; }

            // Determine the AJAX request by the URL it's fetching
            if ( url.indexOf('/trades/active') !== -1 ) {
                // This is us loading the outgoing trades
                // Handling has been relocated to loadOutgoingTrades()
                // No action is required

            } else if ( url.search(/^\/trades\/[A-Za-z_\/]+/) !== -1 ) {
                // This is a call to something under /trades/ that isn't a trade table fetch
                // It could be a card confirmation dialog, a lock release,
                //   or the user committing to send a card
                // No action is required

            } else {
                // We've ruled out everything else; this is a trade table fetch
                // It can come in three forms
                //   /trades or /trades/ -> vanilla reload, getting the first page of trades
                //   /trades/[NUM]       -> fetching a specific page of trades

                // On ANY table fetch we need to re-apply filters and check for alerts
                this.parseTradeTable();
                this.events.tableLoadComplete = true;
                this.reloadComplete();
            }
        }.bind(this));


        // Button and input listeners to keep the settings form pretty
        $('button#start').click(function () {
            this.addNote('Reload started', 'text-success');
            this.go();
        }.bind(this));
        $('button#stop').click(function () {
            this.donationRequest();
            this.addNote('Reload stopped', 'text-warning');
            this.stop();
        }.bind(this));


        // The infinite scroll option should apply immediately (if we're running)
        // The infinite scroll should always be disabled when the reloader is paused
        $('input#disableInfScroll').click(function () {
            var isChecked = $('input#disableInfScroll').prop('checked');

            if ( this.running ) {
                if ( isChecked ) {
                    $(this.tableStr).infinitescroll('pause');

                } else {
                    $(this.tableStr).infinitescroll('resume');
                }
            }
        }.bind(this));


        $('button#save').click(function () {
            this.loadSettingsFromPage();
            this.saveSettingsToLocal();
        }.bind(this));
        $('button#reset').click(this.loadDefaultSettings.bind(this));

        $('input#alertOnBundle').click(this.updatePageState.bind(this));
        $('input#alertColorizeBundleRows').click(this.updatePageState.bind(this));

        $('input#alertOnOutgoing').click(this.updatePageState.bind(this));
        $('input#alertColorizeOutgoingRows').click(this.updatePageState.bind(this));

        $('input#alertPlaySound').click(this.updatePageState.bind(this));
        $('i#alertPreviewSound').click(function () {
            this.loadSettingsFromPage();
            $('audio#alertSound').trigger('play');
        }.bind(this));

        $('input#filterCardsByValue').click(this.updatePageState.bind(this));
        $('input#filterMembersByPoints').click(this.updatePageState.bind(this));


    },

    // Responsible for initial loading and setup
    setup: function () {
        if ( window.location.href.toLowerCase().indexOf('pucatrade.com') === -1 ) {
            alert('Hey!  This doesn\'t look like PucaTrade!');
            return this;
        }

        if ( window.location.href.toLowerCase().indexOf('pucatrade.com/trades') === -1 ) {
            alert('Hey!  This isn\'t the Trades section!');
            return this;
        }


        // Required styling options
        $('<style id="pucaPowerCSS" type="text/css"></style>').appendTo('head');
        $('style#pucaPowerCSS').append('.noteItem { list-style: disc inside !important; }');


        // Load the user's settings (if possible)
        this.loadDefaultSettings();
        this.loadSettingsFromLocal();

        // Disable AJAX caching
        $.ajaxSetup({ cache: false });

        // Disable the infinite scrolling
        $(this.tableStr).infinitescroll('pause');


        // Add the settings form by clobbering the help text, add timestamp to prevent caching
        $('div.explain-text').load(this.formUrl + '?' + this.time(), function () {
            this.debug(1, 'Input form loaded');

            this.applySettingsToPage();

            this.setupListeners();

            $('#pucaPowerVersion').text(this.version);

            $('button#stop').prop('disabled', true);

            this.donationRequest();
            this.news();
        }.bind(this));


        // Setup google analytics
        window._gaq = window._gaq || [];
        window._gaq.push(['pucaPowerGA._setAccount', 'UA-62931323-2']);
        window._gaq.push(['pucaPowerGA._trackPageview', '/trades']);

        (function() {
            var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
            ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
            var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
        })();


        return this;
    }
}.setup();