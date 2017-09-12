Clock Timepicker Plugin for jQuery
==================================

<img src="http://plugins.slyweb.ch/jquery-clock-timepicker/screenshot.png" alt="jquery-clock-timepicker screenshot" />

[See a demo here](http://plugins.slyweb.ch/jquery-clock-timepicker)

A free jQuery Plug-in to select the time with a clock inspired by the Android time picker. This plugin works on Desktop and Mobile phones.


Requirements
------------
* [jQuery](http://jquery.com/)


Installation
------------

Install from [NPM](http://www.npmjs.com/package/jquery-clock-timepicker) as ```jquery-clock-timepicker```.

```npm install jquery-clock-timepicker```


Usage
-----

```javascript
$('.your-time-field').clockTimePicker(options);
```

Include the file `jquery-clock-timepicker.min.js` in your page. There is no need of a CSS file.

The Plug-in is customizable through the optional ```options``` object passed to the jQuery method.


Options
-------

- **afternoonHoursInOuterCircle**  
Set this option to true to display the afternoon hours in the outer circle instead of the inner circle.  
*default: false*

- **autosize**  
Set this to true, if the width of the input field should be automatically adjusted to its content.  
*default: false*

- **colors.buttonTextColor**  
The text color of the buttons display on the mobile phone.  
*default: '#0797FF'*

- **colors.clockFaceColor**  
The color of the clock face.  
*default: '#EEEEEE'*

- **colors.clockInnerCircleTextColor**  
The text color of the numbers displayed in the inner circle.  
*default: '#888888'*

- **colors.clockOuterCircleTextColor**  
The text color of the numbers displayed in the outer circle.  
*default: '#000000'*

- **colors.hoverCircleColor**  
The color of the circle when hovering over an hour or minute.  
*default: '#DDDDDD'*

- **colors.popupBackgroundColor**  
The background color of the popup.  
*default: '#FFFFFF'*

- **colors.popupHeaderBackgroundColor**  
The background color of the popup header displayed only on the mobile phone.  
*default: '#0797FF'*

- **colors.popupHeaderTextColor**  
The text color of the popup header displayed only on the mobile phone.  
*default: '#FFFFFF'*

- **colors.selectorColor**  
The color of the time selector.  
*default: '#0797FF'*

- **colors.selectorNumberColor**  
The text color of the number that is selected.  
*default: '#FFFFFF'*

- **duration**  
If true, the hours can be greater than 23.  
*default: false*

- **durationNegative**  
If true, the duration can be negative. This settings only has effect if the setting **duration** is set to true.  
*default: false*

- **fonts.buttonFontSize**  
The font size of the buttons. These buttons are only displayed in the mobile version.  
*default: 20*

- **fonts.clockInnerCircleFontSize**  
The font size of the numbers that are displayed in the inner circle.  
*default: 12*

- **fonts.clockOuterCircleFontSize**  
The font size of the numbers that are displayed in the outer circle.  
*default: 14*

- **fonts.fontFamily**  
The font family used to display the numbers.  
*default: 'Arial'*

- **i18n.cancelButton**  
The name of the button to cancel the time change. Only displayed on mobile phones.  
*default: 'Cancel'*

- **i18n.okButton**  
The name of the button to confirm the time change. Only displayed on mobile phones.  
*default: 'OK'*

- **maximum**  
(NOT IMPLEMENTED YET) You may define the maximum duration/time.  
*default: null*

- **minimum**  
(NOT IMPLEMENTED YET) You may define the minimum duration/time.  
*default: null*

- **modeSwitchSpeed**  
The speed in milliseconds of the switch animation when changing between hour and minute selection.  
*default: 500*

- **onlyShowClockOnMobile**  
If true, the clock time picker is not shown on Desktop version.  
*default: false*

- **onChange**  
Called when the time value has been changed.  
*default: function(newValue, oldValue) {}*

- **onClose**  
Called when timepicker popup has been closed.  
*default: function() {}*

- **onModeSwitch**  
Called when timepicker is switching between hour and minute selection mode. Argument *selectionMode* is "HOUR" or "MINUTE".  
*default: function(selectionMode) {}*

- **onOpen**  
Called when timepicker popup has been opened.  
*default: function() {}*

- **popupWidthOnDesktop**  
The width of the popup in the Desktop version in pixels. On the mobile phone the width is automatically calculated.  
*default: 200*

- **precision**  
When setting the precision to i.e. 5, user may only choose time in 5 minutes steps (8:00, 8:05, 8:10, ...). Valid values for precision are: 1, 5, 10, 15, 30, 60.  
*default: 1*

- **separator**  
The separator separating the hour and the minute parts.  
*default: :*

- **useAmPm**  
(NOT IMPLEMENTED YET) Set to true, if you want to use the American/Canadian time with AM and PM.  
*default: false*

- **vibrate**  
If this is activated the mobile phone vibrates while changing the time.  
*default: true*


Help
----

Submit a [GitHub Issues request](https://github.com/loebi-ch/jquery-clock-timepicker/issues/new).


- - -

This software is made available under the open source MIT License. &copy; 2017 [Andreas Loeber](http://github.com/loebi-ch) and [contributors](https://github.com/loebi-ch/jquery-clock-timepicker/graphs/contributors)
