// Brainswap helpers
// =============================
// Helper functions

(function (ns) {
    var h = ns.helpers = {};

    // Shortcut for changing location hash.
    h.goTo = function (section, trigger) {
        ns.router.navigate(section, {
            trigger : trigger
        });
    };

    // Shortcut to going home since "home" changes.
    h.goHome = function () {
        console.log('Go home');
        this.goTo('portfolios/');
    };

    // Returns whether you are logged in or not (bool).
    h.isLoggedIn = function(){
        return window.localStorage && ns.helpers.storageGet("userData") && ns.helpers.storageGet("token");
    };

    // Shortcut to going home since "home" changes.
    h.goLogin = function () {
        this.goTo('login');
    };

    h.goSignUp = function () {
        this.goTo('signup');
    };

    // Ensure response of ajax call is valid obj.
    h.prepResponse = (function () {
        var parse = window.JSON ? window.JSON.parse : eval;
        return function (r) {
            if (!r) {
                throw Error('Invalid empty JSON response from the server.');
            }
            console.log('Parsing', r);
            if (typeof r == 'string') {
                try {
                    var json = parse(r);
                }catch(er){
                    throw Error('Error parsing JSON from server: '+er, er);
                }
                return  json;
                //return  parse('(' + r + ')');
            } else {
                return r;
            }
        };
    })();

    h.logout = function(){
        // Send api call to remove session:
        ns.helpers.apiCall('user/logout', 'POST', null, function (r) {
            console.log('Logout successfully');

            ns.currentUser = null;
            ns.publicMode = true;

            if (window.localStorage) {
                ns.helpers.storageRemove("token");
                ns.helpers.storageRemove("userData");
                ns.helpers.storageRemove('activeLogin')
            }

            ns.helpers.goSignUp();
        }, function (r) {
            console.log('Error while logout');
            //alert(r);
        });
    },

    // Get currently loaded theme.
    h.getCurrentLoadedTheme = function(){
        var $style = $('#theme-stylesheet');
        if ($style.length){
            var themes = $('#theme-stylesheet').attr('href').match(/\/(\w+)\/index\.css$/);

            if (themes && themes.length) {
               return themes[1];
            }
            else {
               return 'light';
            }
        } else {
            return 'light';
        }
    };

    h.cookieSet = function (name, value, days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    };

    h.cookieGet = function (name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substr(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substr(nameEQ.length, c.length);
        }
        return null;
    };

    h.cookieDelete = function (name) {
        //console.log('this', this);
        this.cookieSet(name, "", -1);
    };

    h.apiCall = function (url, type, data, success, error, ownAPI, useJSONP) {
        console.log("apiCall url: "+url);
        if (ownAPI == undefined) {
            ownAPI = true;
        }
        if (useJSONP == undefined) {
            useJSONP = false;
        }
        if (type != 'GET' && type != 'POST' && type != 'PUT' && type != 'DELETE') type = 'GET';
        var sep = url.indexOf('?') !== -1 ? '&' : '?';
        if (!data) data = {};
        if (ns.data.currentToken) data.token = ns.data.currentToken;

        var url = ownAPI == true ? ns.apiURL + url : url

        //$.support.cors = true;
        $.ajax({
            url:url,
            dataType:useJSONP ? 'jsonp' : 'json',
            type:type,
            data:data,
            success:function(responseObj, textStatus, jqXHR){
                success(responseObj, textStatus, jqXHR);
            },
            error:function(jqXHR, textStatus, errorThrown){
                //Possible values for the second argument (besides null) are "timeout", "error", "abort", and "parsererror".
                console.warn("mandible.helpers.apiCall for: "+url+" error: jqXHR: "+jqXHR+" textStatus: "+textStatus+" errorThrown: "+errorThrown);
                var errorType = textStatus || "unspecified";
                var apiPath = url.split("dontbreak.")[1].split("com/").join("").split("me/").join("");
                ns.helpers.trackEvent('API Error', apiPath, 'type '+errorType);
                if (jqXHR.responseText){
                    //try to convert responseText into error json
                    try {
                        var errorObj = ns.helpers.prepResponse(jqXHR.responseText);
                    } catch(er){
                        console.warn("mandible.helpers.apiCall:error unable to parse error response json");
                    }
                }
                if (error) error(jqXHR, textStatus, errorThrown, errorObj) }
        });
    };

    // Called when already or just authenticated.
    // Called when 'whoami' is successful or on login form callback.
    h.onAuthenticated = function (responseObj) {
        var hash = window.location.hash;
        //Display icons in header
        // TODO: Calling this here causes themes not to work.
        ns.data.currentToken= responseObj.token;
        ns.currentUser = new ns.classes.models.Contact(responseObj.user);
        ns.data.portfolios.fetch(function (r) {
            console.log('Portfolios fetched');
        });

        // If this is a login or welcome page, take user home.
        if (hash == '' || hash == '#!/login' || hash == '#!/signup' || hash == '#') {
            h.goHome();
        }
    };

    h.loadTemplate = function (id) {
        console.log('load template', id);
        var tmpl = $('#' + id).html();
        if (tmpl === null) {
            throw Error('#' + id + ' template doesn\'t exist');
        }
        return _.template(tmpl);
    };

    // Get str from localStorage
    h.storageGet = function (str) {
        return lscache.get('bs-' + str);
    };

    // Set key / value in localStorage. Optional time in minutes.
    h.storageSet = function (key, value, time) {
        key = 'bs-' + key;
        return lscache.set.apply(null, [].splice.call(arguments, 0));
    };

    h.storageRemove = function (str) {
        return lscache.remove('bs-' + str);
    };

    // Thanks to Android HTML5 team for the spinner.
    h.showSpinner = function (msg) {
        var template = ns.data.templates.spinner({
            message:msg || 'Loading...'
        });
        $('html').prepend(template).addClass('loading');
    };

    h.hideSpinner = function () {
        $('html').removeClass('loading').find('> #spinner').remove();
        return this;
    };

    h.formatDate = function (timestamp) {
        timestamp = parseInt(timestamp) * 1000;
		if (isNaN(timestamp)) return '';
        var date = new Date(timestamp);
        var monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return monthList[date.getMonth()] + ' ' + date.getDate() + ", " + date.getFullYear();
    };

    h.htmlEncode = function(value){
        return value ? $('<div/>').text(value).html() : '';
    }
    h.htmlDecode =function(value){
        return value ? $('<div/>').html(value).text() : '';
    };

    // Play random type of sound.
    h.playRandomSound = function(type){
        var soundAr = ns.data[type + 'Sounds'];
        var sound = soundAr[Math.floor(Math.random() * soundAr.length)]
        this.playSound('/sounds/' + type + '_' + sound + '.wav');
    };

    h.playSound = function(action){
        var $audioPlayer = $('#audio-player');
        var theme = ns.data.user.get('sounds');
        var themePack;
        var themePackComboLength;
        var file;

        if (theme !== 'off'){
            themePack = ns.data.sounds.themes[theme];
            themePackComboLength = themePack[action].length;

            if (action == 'combo'){
                file = themePack[action][ Math.floor(Math.random() * themePackComboLength)];
            }else{
                file = ns.data.sounds.themes[theme][action];
            }

            console.log('playing sound: ', '/sounds/' + theme + '/' + file + '.wav');
            $audioPlayer.attr('src', '/sounds/' + theme + '/' + file + '.wav');
            $audioPlayer.trigger('play');
        }
    };

    // Instantiate default calendar modals into calendar collection.
    h.populateDefaultCalendarCollection = function(){
        var models = [];

        _.each(ns.data.monthsAr, function(month, index){
            var thisMonth = {
                id : index,
                title : ns.data.months[index],
                days : month[1],
                firstDay : month[0]
            };

            models.push(new ns.classes.models.Calendar(thisMonth));
        });

        return models;
    };

})(mandible);
