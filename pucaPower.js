/*jslint browser: true, devel: true, plusplus: true, sloppy: true, vars: true, white: true */
var pucaPower = {

    /* ===== INTERNAL VARIABLES ===== */

    version: "v1.0a2",
    formUrl: "https://llamasoft.github.io/Puca-Power/controls.html",

    // Default values for internal settings
    // If you change this structure, you need to update the following:
    //   applySettingsToPage
    //   loadSettingsFromPage
    //   controls.html
    defaults: {
        reloadInterval: 60,

        alert: {
            enabled: true,
            bundleThreshold: 500,
            colorizeRows: true,
            colorizeColor: '#CCFF99',
            playSound: true,
            soundFile: 'https://llamasoft.github.io/Puca-Power/alert.mp3'
        },

        filter: {
            cards: false,
            minCardValue: 50
        }
    },

    reloadInterval: null,
    alert: null,
    filter: null,

    // Status variables
    running: false,
    hasAlerted: true,

    // Handles to setTimeout()/setInterval() in case we need to stop it
    reloadTimeout: null,
    changeTimeout: null,

    // Selector string to pull the trade table rows
    tableStr: 'table.infinite tbody',
    tableRowStr: 'table.infinite tbody tr[id^="uc_"]',

    // How long in milliseconds to wait after the final table update to parse trade data
    tableChangeDelay: 250,

    // Array of objects of the loaded trade data
    // Each entry is {dom, memberName, memberPts, cardName, cardPts}
    tableData: [],

    // Object of objects of the table data grouped by member
    // Each object is {memberPts, cardQty, totalCardPts, hasAlert}, key is member name
    memberData: {},

    // Enable debug messages
    // debugLevel  0 - No debug messages/errors only
    // debugLevel  1 - Important messages only
    // debugLevel  2 - Semi-important messages
    // debugLevel  3 - Informational messages
    // debugLevel >3 - Probably noise
    debugLevel: 1,
    debug: function (msgLevel, msg) {
        if ( msgLevel <= this.debugLevel ) {
            console.log('[' + msgLevel + '] - ' + msg);
        }
    },



    /* ===== SETTINGS FUNCTIONS ===== */

    // Reset all settings to default values
    // Calls applySettingsToPage()
    loadDefaultSettings: function () {
        this.debug(2, 'Resetting settings to default values');

        this.reloadInterval = this.defaults.reloadInterval;
        this.alert          = this.defaults.alert;
        this.filter         = this.defaults.filter;

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
            version:        this.version,
            reloadInterval: this.reloadInterval,
            alert:          this.alert,
            filter:         this.filter,
            debugLevel:     this.debugLevel
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

        if ( settings.version && settings.version !== this.version ) {
            this.debug(1, 'Settings version mismatch, purging settings');
            this.clearLocalSettings();
            return;
        }

        this.reloadInterval = settings.reloadInterval;
        this.alert          = settings.alert;
        this.filter         = settings.filter;
        this.debugLevel     = settings.debugLevel;
    },


    // Load settings from controls on the page
    // Implicitly calls applySettingsToPage()
    loadSettingsFromPage: function () {
        this.debug(4, 'Loading settings from page');

        var safeParse = function (value, nanFallback, negFallback) {
            var temp = parseInt(value, 10);
            if ( isNaN(temp) ) { temp = nanFallback; }
            if (  temp <= 0  ) { temp = negFallback; }
            return temp;
        };

        this.reloadInterval = safeParse(
            $('input#reloadInterval').val(),
            this.reloadInterval,
            this.defaults.reloadInterval
        );

        this.alert = {
            enabled:         $('input#alertEnabled').prop('checked'),
            bundleThreshold: safeParse(
                                 $('input#alertBundleThreshold').val(),
                                 this.alert.bundleThreshold,
                                 this.defaults.alert.bundleThreshold
                             ),
            colorizeRows:    $('input#alertColorizeRows').prop('checked'),
            colorizeColor:   $('input#alertColorizeColor').val(),
            playSound:       $('input#alertPlaySound').prop('checked'),
            soundFile:       $('input#alertSoundFile').val().trim()
        };

        this.filter = {
            cards:        $('input#filterCards').prop('checked'),
            minCardValue: safeParse(
                              $('input#filterMinCardValue').val(),
                              this.filter.minCardValue,
                              this.defaults.filter.minCardValue
                          )
        };

        // In case safeParse() changed anything
        this.applySettingsToPage();

        // this.saveSettingsToLocal();
    },

    // Update HTML inputs to match current settings
    // Calls updatePageState() on completion
    applySettingsToPage: function () {
        this.debug(4, 'Applying active settings to page');

        $('input#reloadInterval').val(this.reloadInterval);

        $('input#alertEnabled').prop('checked', this.alert.enabled);
        $('input#alertBundleThreshold').val(this.alert.bundleThreshold);

        $('input#alertColorizeRows').prop('checked', this.alert.colorizeRows);
        $('input#alertColorizeColor').val(this.alert.colorizeColor);
        $('input#alertPlaySound').prop('checked', this.alert.playSound);

        $('audio#alertSound').attr('src', this.alert.soundFile);
        $('input#alertSoundFile').val(this.alert.soundFile);

        $('input#filterCards').prop('checked', this.filter.cards);
        $('input#filterMinCardValue').val(this.filter.minCardValue);

        this.updatePageState();
    },

    // Enable or disable inputs based on current options
    // Called from applySettingsToPage()
    updatePageState: function () {
        var isChecked;
        var isEnabled;

        // The "alert enabled" option is connected to all other alert settings
        isChecked = $('input#alertEnabled').prop('checked');
        $('input#alertBundleThreshold').prop('disabled', !isChecked);
        $('input#alertPlaySound').prop('disabled', !isChecked);
        $('input#alertSoundFile').prop('disabled', !isChecked);
        $('input#alertColorizeRows').prop('disabled', !isChecked);
        $('input#alertColorizeColor').prop('disabled', !isChecked);

        // The "play sound" option is connected to the "sound file" option
        isChecked = $('input#alertPlaySound').prop('checked');
        isEnabled = !$('input#alertPlaySound').prop('disabled');
        $('input#alertSoundFile').prop('disabled', !(isEnabled && isChecked));

        // The "colorize rows" option is connected to the "colorize color" option
        isChecked = $('input#alertColorizeRows').prop('checked');
        isEnabled = !$('input#alertColorizeRows').prop('disabled');
        $('input#alertColorizeColor').prop('disabled', !(isEnabled && isChecked));

        // The "enable filter" option is connected to the "minimum card value" option
        isChecked = $('input#filterCards').prop('checked');
        $('input#filterMinCardValue').prop('disabled', !isChecked);
    },



    /* ===== TABLE PARSING FUNCTIONS ===== */

    // Load the trade table data into manageable structures
    parseTableData: function () {
        // Don't bother parsing the data if auto-match is turned off
        if ( !$('input.niceToggle.intersect').prop('checked') ) {
            this.debug(2, 'Skipping trade table parse, auto-match is off');
            return;
        }

        this.debug(2, 'Parsing trade table data');

        this.tableData = [];
        this.memberData = {};

        // Parse all rows, hidden or not (scrolling may have added more entries)
        var tableRows = $(this.tableRowStr);

        var i;
        var curRow, curFields;
        var cardName, cardPts;
        var memberName, memberPts;

        // For each row in the trade table
        for (i = 0; i < tableRows.length; i++) {
            curRow = $(tableRows).eq(i);
            curFields = $(curRow).find('td');

            // Extract the relevant table fields
            cardName   =           $(curFields).eq(1).text().trim();
            cardPts    = parseInt( $(curFields).eq(2).text(), 10 );
            memberName =           $(curFields).eq(4).text().trim();
            memberPts  = parseInt( $(curFields).eq(5).text(), 10 );

            // Data per row
            this.tableData.push({
                dom:        curRow,
                memberName: memberName,
                memberPts:  memberPts,
                cardName:   cardName,
                cardPts:    cardPts
            });

            // Data per member
            if ( !this.memberData[memberName] ) {
                // Make a new entry
                this.memberData[memberName] = {
                    memberPts:    memberPts,
                    cardQty:      1,
                    totalCardPts: cardPts,
                    hasAlert:     false
                };

            } else {
                // Update an existing entry
                this.memberData[memberName].cardQty++;
                this.memberData[memberName].totalCardPts += cardPts;
            }
        }
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
        this.debug(3, 'Adding alert item: ' + alertText);

        $('li#defaultNote').hide();
        $('ul#noteList').append( $('<li class="noteItem">').html(alertText).addClass(alertClass) );
    },

    checkForAlerts: function () {
        this.debug(2, 'Checking for alerts');

        var i;
        var pendingAlerts = []; // { msg, style, weight }
        
        var memberName, memberPts;
        var cardQty, totalCardPts;
        var tradeValue;

        // First iterate the individual members
        for (i in this.memberData) {
            if ( !this.memberData.hasOwnProperty(i) ) { continue; }
        
            memberName   = i;
            memberPts    = this.memberData[i].memberPts;
            cardQty      = this.memberData[i].cardQty;
            totalCardPts = this.memberData[i].totalCardPts;

            // The bundle is only worth what the member can actually pay for
            tradeValue = Math.min(totalCardPts, memberPts);

            // Does this qualify for an alert?
            if ( this.alert.enabled && tradeValue >= this.alert.bundleThreshold ) {
                this.memberData[i].hasAlert = true;

                // Queue the alert
                // If the trade value is limited by the user's points, mark the entry
                pendingAlerts.push({
                    msg: '<strong>' + memberName + ' (' + memberPts + ' points)</strong> wants '
                        + cardQty + ' cards for <strong>' + totalCardPts + ' points</strong>',
                    style: (totalCardPts > memberPts ? 'text-warning' : ''),
                    weight: tradeValue
                });
            }
        }

        // Iterate the table elements and colorize if necessary
        for (i = 0; i < this.tableData.length; i++) {
            memberName = this.tableData[i].memberName;

            if ( this.memberData[memberName].hasAlert ) {
                // Reveal the row if previously hidden by filter
                $(this.tableData[i].dom).show();

                // Colorize if necessary
                if ( this.alert.colorizeRows ) {
                    $(this.tableData[i].dom).find('td').css('background-color', this.alert.colorizeColor);
                }
            }
        }


        // Play alert sound if necessary
        if ( pendingAlerts.length > 0 && this.alert.playSound && !this.hasAlerted ) {
            $('audio#alertSound').trigger('play');
            this.hasAlerted = true;
        }

        
        // Sort the alerts by weight
        pendingAlerts.sort(function (a, b) { return (b.weight - a.weight); });
        
        // Display the alerts
        for (i = 0; i < pendingAlerts.length; i++) {
            this.addNote(pendingAlerts[i].msg, pendingAlerts[i].style);
        }
    },



    /* ===== FILTER FUNCTIONS ===== */

    filterTrades: function () {
        this.debug(2, 'Filtering trades');
        var i;
        var filterQty = 0;
        var memberName;
        var cardName;
        var cardPts;
        var hasAlert;

        for (i = 0; i < this.tableData.length; i++) {
            memberName = this.tableData[i].memberName;
            cardName = this.tableData[i].cardName;
            cardPts = this.tableData[i].cardPts;
            hasAlert = this.memberData[memberName].hasAlert;

            if ( this.filter.cards && cardPts < this.filter.minCardValue && !hasAlert ) {
                this.debug(4, 'Filtering trade: ' + cardName + ' (' + cardPts + ')');
                $(this.tableData[i].dom).hide();
                filterQty++;
            }
        }

        if ( filterQty > 0 ) {
            this.addNote('Filtered ' + filterQty + ' trades', 'muted');
        }
        $('p#total').text('Total: ' + (this.tableData.length - filterQty));
    },



    /* === DRIVER FUNCTIONS === */

    watchForTableChange: function () {
        $(this.tableStr).bind('DOMSubtreeModified', this.tableChangeDetected.bind(this));
    },

    ignoreTableChange: function () {
        $(this.tableStr).unbind('DOMSubtreeModified');
    },

    // Initiate trade data refresh
    go: function () {
        this.debug(1, 'Reloading table data');

        // Reload settings in case something changed
        this.loadSettingsFromPage();

        this.running       = true;
        this.reloadTimeout = null;
        this.hasAlerted    = false;

        $('button#start').removeClass('btn-success');
        $('button#stop').addClass('btn-danger');

        // Auto-match must be on, otherwise things get weird with alerts and filtering.
        // We only need to call loadTableData() if auto-match is off as
        //   toggling auto-match automatically reloads the table.
        if ( !$('input.niceToggle.intersect').prop('checked') ) {
            this.debug(2, 'Enabling auto-match');
            $('.niceToggle.intersect').click();
            
            // Toggling auto-match adds an extra delay, be sure to give it extra time
            this.tableChangeDelay = 1000;
            
        } else {
            loadTableData();
            this.tableChangeDelay = 250;
        }

        // loadTableData() is asynchronous, we need to manually detect when it finishes updating
        // This event will also be called whenever the infinite table scrolls across pages
        this.watchForTableChange();
    },

    // tableChangeDelay milliseconds after the final call to this function
    //   we will call the tableChangeFinished function
    tableChangeDetected: function () {
        this.debug(99, 'Table change detected');
        clearTimeout(this.changeTimeout);
        this.changeTimeout = setTimeout(this.tableChangeFinished.bind(this), this.tableChangeDelay);
    },

    // The trade table finished updating and we can now load the data
    // This can also be triggered by the infinite table having data added
    tableChangeFinished: function () {
        this.ignoreTableChange();

        this.parseTableData();

        this.clearAllNotes();
        this.checkForAlerts();
        this.filterTrades();

        // Repeat if 1) we're running, 2) we don't have a reload pending, 3) the reload interval is positive
        if (this.reloadInterval > 0 && !this.reloadTimeout && this.running) {
            this.reloadTimeout = setTimeout(this.go.bind(this), this.reloadInterval * 1000);
            this.debug(4, 'Refresh timeout set, handle = ' + this.reloadTimeout);
        }

        this.watchForTableChange();
    },

    // Stop the reload, clear the reload handle
    stop: function () {
        this.debug(1, 'Stopping table reload');

        this.running    = false;
        this.hasAlerted = true;

        $('button#start').addClass('btn-success');
        $('button#stop').removeClass('btn-danger');

        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = null;
        }
    },


    setup: function () {
        if ( window.location.href.toLowerCase().indexOf('pucatrade.com') === -1 ) {
            alert('Hey!  This doesn\'t look like PucaTrade!');
            return this;
        }
    
        // Required styling options
        $('<style id="pucaPowerCSS" type="text/css"></style>').appendTo('head');
        $('style#pucaPowerCSS').append('.noteItem { list-style: disc inside !important; }');

        this.loadDefaultSettings();
        this.loadSettingsFromLocal();

        // Clobber the default help text and replace it with our settings form
        $('div.explain-text').load(this.formUrl, function () {
            this.debug(1, 'Input form loaded');

            this.applySettingsToPage();

            $('#pucaPowerVersion').text(this.version);
            $('button#start').click(this.go.bind(this));
            $('button#stop').click(this.stop.bind(this));
            $('button#save').click(function () {
                this.loadSettingsFromPage();
                this.saveSettingsToLocal();
            }.bind(this));
            $('button#reset').click(this.loadDefaultSettings.bind(this));

            $('input#alertEnabled').click(this.updatePageState.bind(this));
            $('input#alertColorizeRows').click(this.updatePageState.bind(this));
            $('input#alertPlaySound').click(this.updatePageState.bind(this));
            $('i#alertPreviewSound').click(function () { $('audio#alertSound').trigger('play'); });

            $('input#filterCards').click(this.updatePageState.bind(this));

        }.bind(this));

        // Disable the infinite scroll feature
        //   It repeatedly calls loadTableData() which causes lag
        $(this.tableStr).infinitescroll('unbind');

        return this;
    }
}.setup();