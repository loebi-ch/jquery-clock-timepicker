Clock Timepicker Plugin for jQuery
==================================

<img src="https://plugins.slyweb.ch/jquery-clock-timepicker/screenshot.png" alt="jquery-clock-timepicker screenshot" />

[See a demo here](https://plugins.slyweb.ch/jquery-clock-timepicker)

A free jQuery Plug-in to select the time with a clock inspired by the Android time picker. This plugin works on Desktop and Mobile phones.


Requirements
------------
* [jQuery](https://jquery.com/)

Note: You need the regular version of jQuery as the slim version does not include effects, which this library requires.


Installation
------------

Install from [NPM](https://www.npmjs.com/package/jquery-clock-timepicker) as ```jquery-clock-timepicker```.

```npm install jquery-clock-timepicker```


Usage
-----

```javascript
$('.your-time-field').clockTimePicker(options);
```

Include the file `jquery-clock-timepicker.min.js` in your page. There is no need of a CSS file.

The Plug-in is customizable through the optional ```options``` object passed to the jQuery method, i.e.

```javascript
$('.your-time-field').clockTimePicker({
	duration: true,
	durationNegative: true,
	precision: 5,
	i18n: {
		cancelButton: 'Abbrechen'
	},
	onAdjust: function(newVal, oldVal) {
		//...
	}
});
```

It is also possible to configure the ClockTimePicker element by using data attributes of the DOM element, i.e.

```html
<input class="time" type="text" data-precision="5" data-minimum="10:00" data-maximum="20:00" />
```

You can combine the configuration by JavaScript and by the DOM data attributes. For example, you can use the JavaScript configuration to make a standard configuration
for all your ClockTimePicker elements on the site and use the DOM data attributes to change configuration for individual elements. The data attributes have precedence
over the JavaScript settings.

If you want to set new options at runtime (after an input element already has been intialized), just call the function again with all desired options.

If you want to dispose/destroy an initialized clock time picker element, please use the following code:

```javascript
$('.your-time-field').clockTimePicker('dispose');
```

If you want to change the value programmatically at runtime on an already initialized clock time picker element, use the following code:

```javascript
$('.your-time-field').clockTimePicker('value', '08:00');
```

Use the following code to show or hide a clock time picker programmatically:

```javascript
$('.your-time-field').clockTimePicker('show');
$('.your-time-field').clockTimePicker('hide');
```



Options
-------

- **afternoonHoursInOuterCircle**  
Set this option to true to display the afternoon hours in the outer circle instead of the inner circle.  
*default: false*

- **alwaysSelectHoursFirst**  
By default, if you click on the minutes part of your input field, the popup is opened to directly select the minutes. If you set this option to true, popup is always opened to select hours first before selecting the minutes.  
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

- **colors.clockInnerCircleUnselectableTextColor**  
The text color of the unselectable numbers displayed in the inner circle. (only used in combination with ```minimum``` and ```maximum``` option)  
*default: '#888888'*

- **colors.clockOuterCircleTextColor**  
The text color of the numbers displayed in the outer circle.  
*default: '#000000'*

- **colors.clockOuterCircleUnselectableTextColor**  
The text color of the unselectable numbers displayed in the outer circle. (only used in combination with ```minimum``` and ```maximum``` option)  
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

- **contextmenu**  
If true, the browser's or a custom context menu is shown on right click.  
If false, the right click behaves like the left click and the clock is shown.  
*default: false*

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

- **hideUnselectableNumbers**  
Set this option to true if you want to completely hide the unselectable numbers (in case you're using ```minimum``` and ```maximum``` option).  
*default: false*

- **i18n.cancelButton**  
The name of the button to cancel the time change. Only displayed on mobile phones.  
*default: 'Cancel'*

- **i18n.okButton**  
The name of the button to confirm the time change. Only displayed on mobile phones.  
*default: 'OK'*

- **maximum**  
With this option you can define the maximum duration/time. Syntax: hh:mm, i.e. 8:30, 12:00, 24:00, 100:00, ...
*default: '23:59'*

- **minimum**  
With this option you can define the minimum duration/time. Syntax: hh:mm, i.e. 06:00, -10:00, -15:45, ...
*default: '-23:59'*

- **modeSwitchSpeed**  
The speed in milliseconds of the switch animation when changing between hour and minute selection.  
*default: 500*

- **onlyShowClockOnMobile**  
If true, the clock time picker is not shown on Desktop version.  
*default: false*

- **onAdjust**  
Called when the time value is been adjusting. Compared to onChange this function is called each time when the value is changing, also while dragging the time selector...  
*default: function(newValue, oldValue) {}*

- **onChange**  
Called when the time value has been changed. This function is called when the input field is loosing its focus.  
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

- **required**  
If this option is set to true, a user cannot empty the field by hitting delete or backspace.  
*default: false*

- **separator**  
The separator separating the hour and the minute parts.  
*default: :*

- **useDurationPlusSign**  
If set to true, positive durations use the plus sign (+) as a prefix.  
*default: false*

- **vibrate**  
If this is activated the mobile phone vibrates while changing the time.  
*default: true*



Help
----

Submit a [GitHub Issues request](https://github.com/loebi-ch/jquery-clock-timepicker/issues/new).



Changelog
---------

**Version 2.6.2**  
- New configuration setting ```contextmenu``` added. See above in the Options section for explanation. Closes pull request #43.  

**Version 2.6.1**  
- jQuery version notice included in README.md  
- ClockTimePicker's version number included as query parameter when loading ```jquery-clock-timepicker.min.js``` in index.html to solve browser caching issue for new released versions.  

**Version 2.6.0**  
- Minified JavaScript without eval() to solve issue #34.  
- Setting HTML value attribute upon time change.  
- Get value by calling ```$('.your-time-field').clockTimePicker('value');``` or ```$('.your-time-field').clockTimePicker('val');```  
- Set value by calling ```$('.your-time-field').clockTimePicker('value', '08:00');``` or ```$('.your-time-field').clockTimePicker('val', '08:00');```  

**Version 2.5.0**  
- Don't open clock canvas when setting value programmatically with ```$('.your-time-field').clockTimePicker('value', '08:00');```  
- New function to show clock canvas programmatically with ```$('.your-time-field').clockTimePicker('show');```  
- New function to hide clock canvas programmatically with ```$('.your-time-field').clockTimePicker('hide');```  

**Version 2.4.0**  
- Position popup "fixed" instead of "absolute" to prevent popup from cut-off in containers with overflow: hidden.  
- Slow down scroll wheel event so that the clock timepicker doesn't spin uncontrollable when using touchpad.  
- Update to jQuery 3.5  

**Version 2.3.5**  
- Issue #29 fixed.  
- Blur input element on enter.  

**Version 2.3.4**  
- Method ```onInputElementKeyUp``` completely refactored to simplify and to solve issue #21.  
- Arrow keys and +/- sign behavior refactored. No wheelspin anymore, stop at ```minimum``` and ```maximum``` values.  
- Bugfix for bluring input element when switching from one clock timepicker element to another one.  

**Version 2.3.3**  
- Issue #14 fixed by inserting code Yauheni-Butski proposed.  
- Issue #28 fixed by changing code as proposed by Yauheni-Butski.  

**Version 2.3.2**  
- Issue #22 fixed. Using div and spans instead of input element on mobile phones to prevent context menu and cursors to show up.  
- Issue #23 fixed. Rounding problem on initialization solved when using option ```precision```.  
- Issue #25 fixed. New option ```alwaysSelectHoursFirst``` inserted.  

**Version 2.3.1**  
- Bugfix for entering durations with keyboard when ```useDurationPlusSign``` is set to ```true```  
- Removed unwanted Console.log  

**Version 2.3.0**  
- Issue #15 solved.  
- Feature request #17 implemented: Showing unselectable numbers when using ```minimum``` and ```maximum``` options.  
- Hide unselectable numbers completely by using ```hideUnselectableNumbers``` option.  
- Configure text colors for unselectable numbers with new options ```clockInnerCircleUnselectableTextColor``` and ```clockOuterCircleUnselectableTextColor```.  
- Feature request #18 implemented: Use of data attributes to configure ClockTimePicker element.  
- Bugfix for wrong hovering when using ```afternoonHoursInOuterCircle``` (Issue #16).  

**Version 2.2.5**  
- Fixed a converting bug when switching between minus and plus sign.  

**Version 2.2.4**  
- Hide example console output that was deployed in version 2.2.3 by mistake.  

**Version 2.2.3**  
- Option ```useDurationPlusSign``` implemented.  

**Version 2.2.2**  
- Issue #12 fixed.  

**Version 2.2.1**  
- Issue #9 perfectionated to select hour/minute part with mouse click.  
- Parse number settings as integer to prevent errors in calculations in case that a string is passed.  
- Pull request #11 from reclaimingmytime inserted.  

**Version 2.2.0**  
- Issue #7 fixed. Now this plugin works in both portrait and landscape mode on the mobile phone.  

**Version 2.1.10**  
- Bluring issues fixed.  

**Version 2.1.9**  
- Directly select minute when clicking inside the minute part.  
- Bluring issues fixed.  
- Issue #9 perfectionated to select hour/minute part with mouse click.  
- Autosizing adjusted so that jquery-clock-timepicker works together with sortablejs.  
- Hide time picker when deleting content with delete or backspace.  
- Show 00:00 when focusing an empty timepicker.  

**Version 2.1.8**  
- Fixed an issue with overlapping popup when input element has a top margin.  

**Version 2.1.7**  
- Issue #9 fixed. Better approach to select hour/minute part with mouse click.  

**Version 2.1.6**  
- Bugfix when entering time/duration with keyboard on an empty input field.  
- Bugfix for keys "+" and "-" in 2.1.5 leaded to another bug with negative duration fields. Corrected in this version.  

**Version 2.1.5**  
- Precision 60 bugfix: In some cases the time picker switched to minute mode although precision 60 was set.  
- Bugfix for keys "+" and "-" to adjust value in correct direction: + = plus, - = minus.  

**Version 2.1.4**  
- Added function to set value on an already initialized clock time picker element at runtime.  

**Version 2.1.3**  
- Support for keypad with num lock.  

**Version 2.1.2**  
- Call event functions with call() using the element as context so that you can use $(this) inside the callback function to access the element.  

**Version 2.1.1**  
- Bugfix: Sign button clickable on mobile phone  

**Version 2.1.0**  
- Make it possible to dispose an already initialized clock time picker element.  
- Changed the default value for the option ```autosize``` from true to false.  
- New option ```required``` added: If you don't want the user to empty the input element, you can set this option to true.  
- New event ```onAddjust``` added: This option is called on each adjustment of the value, including dragging the timeselector.  
- Sign button +/- implemented in canvas instead of an HTML element to prevent styling issues depending on different global CSS layouts.  
- Selection of hour and minute part with the mouse improved (now also taking account of input element's padding).  
- Key handling improved for backspace, delete and minus key.  
- Arrow keys up and down switched.  
- Context menu on right click disabled.  
- Implementation of ```maximum``` and ```minimum``` option.  

**Version 2.0.0**  
- Event management completeley refactored so that one can use the input's default onchange event.  

**Version 1.x**  
- No changelog available for the first versions of this jQuery component.  


- - -

This software is made available under the open source MIT License. &copy; 2022 [Andreas Loeber](http://github.com/loebi-ch) and [contributors](https://github.com/loebi-ch/jquery-clock-timepicker/graphs/contributors)
