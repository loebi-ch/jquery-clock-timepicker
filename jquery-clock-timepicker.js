/* 
 * Author:  Andreas Loeber
 * Plugin:  jquery-clock-timerpicker
 * Version: 2.1.1
 */
 (function($) {
	 
	$.fn.clockTimePicker = function(options) {
		
		/************************************************************************************************
		  DEFAULT SETTINGS (CAN BE OVERRIDDEN WITH THE OPTIONS ARGUMENT)
		************************************************************************************************/
		var settings = $.extend({
			afternoonHoursInOuterCircle: false,
			autosize: false,
			colors: {
				buttonTextColor: '#0797FF',
				clockFaceColor: '#EEEEEE',
				clockInnerCircleTextColor: '#888888',
				clockOuterCircleTextColor: '#000000',
				hoverCircleColor: '#DDDDDD',
				popupBackgroundColor: '#FFFFFF',
				popupHeaderBackgroundColor: '#0797FF',
				popupHeaderTextColor: '#FFFFFF',				
				selectorColor: '#0797FF',				
				selectorNumberColor: '#FFFFFF',
				signButtonColor: '#FFFFFF',
				signButtonBackgroundColor: '#0797FF'
			},
			duration: false,
			durationNegative: false,
			fonts: {
				fontFamily: 'Arial',
				clockOuterCircleFontSize: 14,
				clockInnerCircleFontSize: 12,
				buttonFontSize: 20
			},
			i18n: {
				okButton: 'OK',
				cancelButton: 'Cancel'
			},
			maximum: '23:59',
			minimum: '-23:59',
			modeSwitchSpeed: 500,
			onlyShowClockOnMobile: false,
			onAdjust: function(newVal, oldVal) { /*console.log('Value adjusted from ' + oldVal + ' to ' + newVal + '.');*/ },
			onChange: function(newVal, oldVal) { /*console.log('Value changed from ' + oldVal + ' to ' + newVal + '.');*/ },
			onClose: function() { },
			onModeSwitch: function() { },
			onOpen: function() { },
			popupWidthOnDesktop: 200,
			precision: 1,
			required: false,
			separator: ':',
			useAmPm: false, //NOT YET IMPLEMENTED
			vibrate: true
		}, typeof options == 'object' ? options : {});
		
		if (settings.precision != 1 && settings.precision != 5 && settings.precision != 10 && settings.precision != 15 && settings.precision != 30 && settings.precision != 60) {
			console.error('%c[jquery-clock-timepicker] Invalid precision specified: ' + settings.precision + '! Precision has to be 1, 5, 10, 15, 30 or 60. For now, the precision has been set back to: 1', 'color:orange');
			settings.precision = 1;
		}
		if (!settings.separator || ('' + settings.separator).match(/[0-9]+/)) {
			console.error('%c[jquery-clock-timepicker] Invalid separator specified: ' + (settings.separator ? settings.separator : '(empty)') + '! The separator cannot be empty nor can it contain any decimals. For now, the separator has been set back to a colon (:).', 'color:orange');
			settings.separator = ':';
		}
		if (settings.durationNegative && !settings.duration) {
			console.log('%c[jquery-clock-timepicker] durationNegative is set to true, but this has no effect because duration is false!', 'color:orange');
		}
		if (settings.maximum && !settings.maximum.match(/^-?[0-9]+:[0-9]{2}$/)) {
			console.log('%c[jquery-clock-timepicker] Invalid time format for option "maximum": ' + settings.maximum + '! Maximum not used...', 'color:orange');
			settings.maximum = null;
		}
		if (settings.minimum && !settings.minimum.match(/^-?[0-9]+:[0-9]{2}$/)) {
			console.log('%c[jquery-clock-timepicker] Invalid time format for option "minimum": ' + settings.minimum + '! Minimum not used...', 'color:orange');
			settings.minimum = null;
		}
		if (settings.minimum && settings.maximum && (settings.minimum == settings.maximum || !isTimeSmallerOrEquals(settings.minimum, settings.maximum))) {
			console.log('%c[jquery-clock-timepicker] Option "minimum" must be smaller than the option "maximum"!', 'color:orange');
			settings.minimum = null;
		}
		
		
		
		/************************************************************************************************
		  DYNAMICALLY INSERT CSS CODE FOR SELECTION ON MOBILE
		 ************************************************************************************************/
		var css = '.clock-timepicker input { caret-color: white; }';
		if (isMobile()) css += ' .clock-timepicker input::selection { background:rgba(255,255,255,0.6); } .clock-timepicker input::-moz-selection { background:rgba(255,255,255,0.6); }';
		function cssAlreadyInitialized() {
			var cssFound = false;
			$('head style').each(function() {
				if ($(this).text() == css) {
					cssFound = true;
					return false;
				}
			});
			if (cssFound) return true;
			else return false;
		}
		if (!cssAlreadyInitialized()) {			
			var style = document.createElement('style');
			style.type = 'text/css';
			if (style.styleSheet) style.styleSheet.cssText = css;
			else style.appendChild(document.createTextNode(css));
			(document.head || document.getElementsByTagName('head')[0]).appendChild(style);
		}
		
		//for each selected element
		return this.each(function() {
			
			//VIBRATION API
			if (!('vibrate' in navigator)) settings.vibrate = false;
			
			if (typeof options == 'string') {
				options = options.toLowerCase();
				if (options == 'dispose') disposeTimePicker($(this));
				else console.log('%c[jquery-clock-timepicker] Invalid option passed to clockTimePicker: ' + options, 'color:red');
				return;
			} else {
				if ($(this).parent().hasClass('clock-timepicker')) disposeTimePicker($(this));
			}
			
			
			
			/************************************************************************************************
			  INITIALIZE VARIABLES
			 ************************************************************************************************/
			var element = $(this);
			element.val(formatTime(element.val()));
			var oldValue = element.val();
			var enteredDigits = '';
			var selectionMode = 'HOUR'; //2 modes: 'HOUR' or 'MINUTE'
			var isDragging = false;
			var touchSignButton = false;
			var hasJustGotFocus = false;
			var popupWidth = isMobile() ? $(document).width() - 80 : settings.popupWidthOnDesktop;
			var canvasSize = popupWidth - (isMobile() ? 50 : 20);
			var clockRadius = parseInt(canvasSize / 2);
			var clockCenterX = parseInt(canvasSize / 2);
			var clockCenterY = parseInt(canvasSize / 2);
			var clockOuterRadius = clockRadius - 16;
			var clockInnerRadius = clockOuterRadius - 29;
			
			
			
			/************************************************************************************************
			  INITIALIZE A NEW PARENT ELEMENT THAT ENCAPSULATES THE INPUT FIELD
			 ************************************************************************************************/
			element.wrap('<div class="clock-timepicker" style="display:inline-block; position:relative">');
			
			
			
			/************************************************************************************************
			  TEMPORARY AUTOSIZE ELEMENT
			 ************************************************************************************************/
			var tempAutosizeElement = $('<div class="clock-timepicker-autosize">');
			tempAutosizeElement.css('position', 'fixed')
							   .css('top', '-500px')
							   .css('left', '-500px')
							   .css('display', 'inline-block')
							   .css('font-size', element.css('font-size'))
							   .css('font-family', element.css('font-family'))
							   .css('font-weight', element.css('font-weight'))
							   .css('border-left', element.css('border-left'))
							   .css('border-right', element.css('border-right'))
							   .css('padding-left', element.css('padding-left'))
							   .css('padding-right', element.css('padding-right'));
			tempAutosizeElement.html('22:22');
			element.parent().append(tempAutosizeElement);
			tempAutosizeElement.css('min-width', tempAutosizeElement.width() + 'px');
			autosize();
			
			
			
			/************************************************************************************************
			  INITIALIZE THE DIV TO DARKEN THE WEBSITE WHILE CHOOSING A TIME
			 ************************************************************************************************/
			var background;
			if (isMobile()) {
				background = $('<div class="clock-timepicker-background">');
				background.css('zIndex', 99998)
							.css('display', 'none')
							.css('position', 'fixed')
							.css('top', '0px')
							.css('left', '0px')
							.css('width', '100%')
							.css('height', '100%')
							.css('backgroundColor', 'rgba(0,0,0,0.6)');
				element.parent().append(background);
				
				function onBackgroundTouchMove(event) {
					event.preventDefault();
				}
				background.off('touchmove', onBackgroundTouchMove);
				background.on('touchmove', onBackgroundTouchMove);
				
				function onBackgroundClick(event) {
					event.preventDefault();
					event.stopImmediatePropagation();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
					return false;
				}
				background.off('click', onBackgroundClick);
				background.on('click', onBackgroundClick);				
			}
			
			
			
			/************************************************************************************************
			  INITIALIZE POPUP
			 ************************************************************************************************/
			var popup = $('<div class="clock-timepicker-popup">');
			popup.css('display', 'none')
				 .css('zIndex', 99999)
				 .css('cursor', 'default')
				 .css('position', 'absolute')
				 .css('width', popupWidth + 'px')
				 .css('backgroundColor', settings.colors.popupBackgroundColor)
				 .css('box-shadow', '0 4px 20px 0px rgba(0, 0, 0, 0.14)')
				 .css('border-radius', '5px')
				 .css('user-select', 'none');
			popup.on('contextmenu', function() { return false; });
			if (isMobile()) {
				popup.css('position', 'fixed')
					 .css('left', '40px')
					 .css('top', '40px');
				
				function onPopupTouchMove(event) {
					event.preventDefault();
				}
				popup.off('touchmove', onPopupTouchMove);
				popup.on('touchmove', onPopupTouchMove);
				
				function onPopupClick(event) {
					event.stopImmediatePropagation();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
					return false;
				}
				popup.off('click', onPopupClick);
				popup.on('click', onPopupClick);
			}
			element.parent().append(popup);
			
			
			
			/************************************************************************************************
			  DESKTOP VERSION: A CLICK OUTSIDE OF THE POPUP SHOULD CLOSE THE TIME PICKER
			 ************************************************************************************************/
			if (!isMobile()) {
				function onWindowClick(event) {
					if (popup.css('display') != 'none' && !($(event.target)[0] == inputElement[0] || $.contains(inputElement.parent()[0], $(event.target)[0]))) {
						hideTimePicker();
					}
				}
				$(window).off('click', onWindowClick);
				$(window).on('click', onWindowClick);
			}
			
			
			
			/************************************************************************************************
			  INITIALIZE INPUT ELEMENT
			 ************************************************************************************************/			
			var inputElement = element;
			if (isMobile()) {
				inputElement = $('<input type="text">');
				inputElement.css('display', 'inline-block')
							.css('width', '100%')
							.css('border', '0px')
							.css('outline', '0px')
							.css('fontSize', isMobile() ? '40px' : '20px')
							.css('padding', '10px 0px')
							.css('textAlign', 'center')
							.css('color', settings.colors.popupHeaderTextColor)
							.css('backgroundColor', settings.colors.popupHeaderBackgroundColor);
				inputElement.prop('readonly', true);
				popup.append(inputElement);
			}			
			if (element.attr('autocomplete')) element.attr('data-autocomplete-orig', element.attr('autocomplete'));
			element.prop('autocomplete', 'off');
			if (element.attr('autocorrect')) element.attr('data-autocorrect-orig', element.attr('autocorrect'));
			element.prop('autocorrect', 'off');
			if (element.attr('autocapitalize')) element.attr('data-autocapitalize-orig', element.attr('autocapitalize'));
			element.prop('autocapitalize', 'off');
			if (element.attr('spellcheck'))	element.attr('data-spellcheck-orig', element.attr('spellcheck'));
			element.prop('spellcheck', false);
			inputElement.on('drag.clockTimePicker dragend.clockTimePicker dragover.clockTimePicker dragenter.clockTimePicker dragstart.clockTimePicker dragleave.clockTimePicker drop.clockTimePicker selectstart.clockTimePicker contextmenu.clockTimePicker', onInputElementDragSelectContextMenu);
			inputElement.on('mousedown.clockTimePicker', onInputElementMouseDown);
			inputElement.on('keyup.clockTimePicker', onInputElementKeyUp);
			inputElement.on('keydown.clockTimePicker', onInputElementKeyDown);
			element.on('mousewheel.clockTimePicker', onInputElementMouseWheel);
			element.on('focus.clockTimePicker', onInputElementFocus);
			
			
					
			/************************************************************************************************
			  INITIALIZE CLOCK CANVASES
			 ************************************************************************************************/
			var canvasHolder = $('<div>');
			canvasHolder.css('position', 'relative')
						.css('width', canvasSize + 'px')
						.css('height', canvasSize + 'px')
						.css('margin', '10px ' + (isMobile() ? 25 : 10) + 'px');
			popup.append(canvasHolder);
			var clockHourCanvas = $('<canvas>');
			clockHourCanvas.css('cursor', 'default')
						   .css('position', 'absolute')
						   .css('top', '0px')
						   .css('left', '0px');
			clockHourCanvas.attr('width', canvasSize);
			clockHourCanvas.attr('height', canvasSize);
			registerDraggingEventsOnCanvas(clockHourCanvas);
			canvasHolder.append(clockHourCanvas);
			var clockMinuteCanvas = $('<canvas>');
			clockMinuteCanvas.css('cursor', 'default')
							 .css('position', 'absolute')
							 .css('top', '0px')
							 .css('left', '0px')
							 .css('display', 'none');
			clockMinuteCanvas.attr('width', canvasSize);
			clockMinuteCanvas.attr('height', canvasSize);
			registerDraggingEventsOnCanvas(clockMinuteCanvas);
			canvasHolder.append(clockMinuteCanvas);
			
			
			
			/************************************************************************************************
			  INITIALIZE BUTTON AREA
			 ************************************************************************************************/
			if (isMobile()) {
				var buttonArea = $('<div>');
				buttonArea.css('text-align', 'right')
						  .css('padding', '15px 30px');
				var buttonHtml = '<a style="text-decoration:none; color:' + settings.colors.buttonTextColor + '; font-family:Arial; font-size:' + settings.fonts.buttonFontSize + 'px; padding-left:30px">';
				var cancelButton = $(buttonHtml);
				cancelButton.html(settings.i18n.cancelButton);
				cancelButton.on('click', function() {
					hideTimePicker();
				});
				buttonArea.append(cancelButton);
				var okButton = $(buttonHtml);
				okButton.html(settings.i18n.okButton);
				okButton.on('click', function() {
					if (isMobile()) element.val(inputElement.val());
					if (settings.vibrate) navigator.vibrate(10);
					hideTimePicker();
				});
				buttonArea.append(okButton);
				popup.append(buttonArea);
			}
			
			
			
			/************************************************************************************************
			  BLUR ALL
			 ************************************************************************************************/
			function blurAll() {
				var tmp = document.createElement("input");
				element.parent().get(0).appendChild(tmp);
				tmp.focus();
				element.parent().get(0).removeChild(tmp);
			}
			
			
			
			/************************************************************************************************
			  REGISTER DRAGGING EVENT LISTENERS ON CANVASES
			 ************************************************************************************************/
			function registerDraggingEventsOnCanvas(canvas) {
				
				//Mouse Drag Events for Desktop Version
				if (!isMobile()) {
					canvas.on('mousedown', function(event) {
						var x = event.pageX - $(this).offset().left;
						var y = event.pageY - $(this).offset().top;
						processTimeSelection(x, y);
						isDragging = true;
					});
					canvas.on('mouseup', function(event) {
						isDragging = false;
						var x = event.pageX - $(this).offset().left;
						var y = event.pageY - $(this).offset().top;
						var selectorLength = Math.sqrt(Math.pow(Math.abs(x - clockCenterX), 2) + Math.pow(Math.abs(y - clockCenterY), 2));
						if (settings.duration && settings.durationNegative && selectorLength <= 20) {
							var oldVal = inputElement.val();
							if (oldVal.match(/^-/)) {
								newVal = oldVal.substring(1);
							} else {
								newVal = '-' + oldVal;
							}
							if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) newVal = formatTime(settings.minimum);
							if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) newVal = formatTime(settings.maximum);
							inputElement.val(newVal);
							repaintClock();
							settings.onAdjust(newVal, oldVal);
							if (selectionMode == 'HOUR') selectHourOnInputElement();
							else selectMinuteOnInputElement();
							return;
						}
						if (!processTimeSelection(x, y, true)) {
							if (settings.precision == 60) {
								hideTimePicker();
								blurAll();
							} else if (selectionMode == 'HOUR') {
								switchToMinuteMode();
								selectMinuteOnInputElement();
							} else {
								hideTimePicker();
								blurAll();
							}
							return false;
						}
						if (selectionMode == 'MINUTE' || settings.precision == 60) {
							hideTimePicker();
							blurAll();
						}
						else {
							switchToMinuteMode();
							selectMinuteOnInputElement();
						}
					});
					canvas.on('mousemove', function(event) {
						var x = event.pageX - $(this).offset().left;
						var y = event.pageY - $(this).offset().top;
						processTimeSelection(x, y);
					});
					canvas.on('mouseleave', function(event) {
						if (selectionMode == 'HOUR') repaintClockHourCanvas();
						else repaintClockMinuteCanvas();
					});
					
					canvas.on('mousewheel', function(event) {
						processMouseWheelEvent(event);
					});
				}
				
				//Touch Events for Mobile Version
				else {
					canvas.on('touchstart', function(event) {
						event.preventDefault();
						var x = event.originalEvent.touches[0].pageX - $(this).offset().left;
						var y = event.originalEvent.touches[0].pageY - $(this).offset().top;
						var selectorLength = Math.sqrt(Math.pow(Math.abs(x - clockCenterX), 2) + Math.pow(Math.abs(y - clockCenterY), 2));
						if (settings.duration && settings.durationNegative && selectorLength <= 20) {
							touchSignButton = true;
							var oldVal = inputElement.val();
							if (oldVal.match(/^-/)) {
								newVal = oldVal.substring(1);
							} else {
								newVal = '-' + oldVal;
							}
							if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) newVal = formatTime(settings.minimum);
							if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) newVal = formatTime(settings.maximum);
							inputElement.val(newVal);
							repaintClock();
							settings.onAdjust(newVal, oldVal);
							if (selectionMode == 'HOUR') selectHourOnInputElement();
							else selectMinuteOnInputElement();
							return;
						}
						processTimeSelection(x, y);
						isDragging = true;
					});
					canvas.on('touchend', function(event) {
						event.preventDefault();
						isDragging = false;
						if (!touchSignButton && settings.precision != 60) {
							switchToMinuteMode();
							selectMinuteOnInputElement();
						}
						touchSignButton = false;
					});
					canvas.on('touchmove', function(event) {
						event.preventDefault();
						if (isDragging) {
							var x = event.originalEvent.touches[0].pageX - $(this).offset().left;
							var y = event.originalEvent.touches[0].pageY - $(this).offset().top;
							processTimeSelection(x, y);
						}
					});
				}
			}
			
			
			
			/************************************************************************************************
			  PROCESSES LEFT OR RIGHT MOUSE CLICK AND SINGLE TAP ON MOBILE PHONES
			 ************************************************************************************************/	
			function processClick(event) {
				if (!inputElement.val()) {
					switchToHourMode();
					showTimePicker();
					return;
				}
				if (hasJustGotFocus) return;				
				if (settings.precision == 60) {
					selectHourOnInputElement();
					return;
				}
				var innerWidth = inputElement.innerWidth() - parseInt(inputElement.css('padding-left')) - parseInt(inputElement.css('padding-right'));
				var inputElementCenter = parseInt(innerWidth / 2 + parseInt(inputElement.css('padding-left')));
				if (event.offsetX >= inputElementCenter) {
					if (selectionMode == 'HOUR' && settings.vibrate) navigator.vibrate(10);
					switchToMinuteMode();
					selectMinuteOnInputElement();
				}
				else {
					if (selectionMode == 'MINUTE' && settings.vibrate) navigator.vibrate(10);
					switchToHourMode();
					selectHourOnInputElement();
				}
			}
			
			
			
			/************************************************************************************************
			  PROCESSES THE MOUSE WHEEL EVENT AND INCREASES OR DECREASES HOURS OR MINUTES
			 ************************************************************************************************/	
			function processMouseWheelEvent(event) {
				var e = window.event || event;
				event.preventDefault();
				var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));				
				(new RegExp('^(-)?([0-9]+)(.([0-9]{1,2}))?$')).test(inputElement.val());
				var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
				var h = parseInt(RegExp.$2);
				if (negative) h = -h;
				var m = RegExp.$4 ? parseInt(RegExp.$4) : 0;
				if (selectionMode == 'HOUR') {
					if (settings.duration && settings.durationNegative && h == 0 && !negative && delta == -1) negative = true;
					else if (settings.duration && settings.durationNegative && h == 0 && negative && delta == 1) negative = false;
					else h += delta;
					if (h == -1) {
						if (!settings.duration) h = 23;
						else if (!settings.durationNegative) h = 0;
					}
					if (h == 24 && !settings.duration) h = 0;
				} else {
					m += (delta * settings.precision);
					if (m < 0) m = 60 + m;
					if (m >= 60) m = m - 60;
				}
				var oldVal = inputElement.val();
				var newVal = (h < 10 && !settings.duration ? '0': '') + (negative && h == 0 ? '-' + h : h) + settings.separator + (m < 10 ? '0' : '') + m;				
				var isMinMaxFullfilled = true;
				if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) isMinMaxFullfilled = false;
				if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) isMinMaxFullfilled = false;
				if (!isMinMaxFullfilled && selectionMode == 'HOUR') {
					if (delta > 0) newVal = formatTime(settings.maximum);
					else newVal = formatTime(settings.minimum);
					isMinMaxFullfilled = true;
				}
				if (isMinMaxFullfilled) {
					inputElement.val(newVal);
					autosize();
					repaintClock();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
					if (newVal != oldVal) settings.onAdjust(newVal, oldVal);
				}
			}
			
			
			
			/************************************************************************************************
			  CONVERTS A CLICK / TOUCH IN THE CANVAS TO A TIME AND SETS THE NEW VALUE
			 ************************************************************************************************/	
			function processTimeSelection(x, y, clicked) {
				var selectorAngle = (360 * Math.atan((y - clockCenterY)/(x - clockCenterX)) / (2 * Math.PI)) + 90;
				var selectorLength = Math.sqrt(Math.pow(Math.abs(x - clockCenterX), 2) + Math.pow(Math.abs(y - clockCenterY), 2));				
				var hour = 0;
				var min = 0;
				var negative = false;
				if ((new RegExp('^(-)?([0-9]+).([0-9]{2})$')).test(inputElement.val())) {
					negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					hour = parseInt(RegExp.$2);
					min = parseInt(RegExp.$3);
				}				
				if (selectionMode == 'HOUR') {
					selectorAngle = Math.round(selectorAngle / 30);
					var h = -1;
					if (selectorLength < clockRadius + 10 && selectorLength > clockRadius - 28) {
						if (x - clockCenterX >= 0) {
							if (selectorAngle == 0) h = 12;
							else h = selectorAngle;
						}
						else if (x - clockCenterX < 0) {
							h = selectorAngle + 6;
						}
					} else if (selectorLength < clockRadius - 28 && selectorLength > clockRadius - 65) {
						if (x - clockCenterX >= 0) {
							if (selectorAngle != 0) h = selectorAngle + 12;
							else h = 0;
						}
						else if (x - clockCenterX < 0) {
							h = selectorAngle + 18;
							if (h == 24) h = 0;
						}
					}
					if (h > -1) {
						var newVal = (negative ? '-' : '') +(h < 10 && !settings.duration ? '0' : '') + h + settings.separator + (min < 10 ? '0' : '') + min;						
						if (isDragging || clicked) {
							var isMinMaxFullfilled = true;
							if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) isMinMaxFullfilled = false;
							if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) isMinMaxFullfilled = false;
							if (!isMinMaxFullfilled) {
								if (settings.maximum && isTimeSmallerOrEquals((negative ? '-' : '') +(h < 10 && !settings.duration ? '0' : '') + h + settings.separator + '00', settings.maximum)) {
									newVal = formatTime(settings.maximum);
									isMinMaxFullfilled = true;
								}
								if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') +(h < 10 && !settings.duration ? '0' : '') + h + settings.separator + '00')) {
									newVal = formatTime(settings.minimum);
									isMinMaxFullfilled = true;
								}
							}
							if (isMinMaxFullfilled) {
								var oldVal = inputElement.val();
								if (newVal != oldVal) {
									if (settings.vibrate) navigator.vibrate(10);
									settings.onAdjust(newVal, oldVal);
								}
								inputElement.val(newVal);
								autosize();
							}
						}
						repaintClockHourCanvas(h == 0 ? 24 : h, settings.duration && settings.durationNegative && selectorLength <= 12);
						return true;
					}
					else {
						repaintClockHourCanvas(null, settings.duration && settings.durationNegative && selectorLength <= 12);
						return false;
					}
				}
				else if (selectionMode == 'MINUTE') {
					selectorAngle = Math.round(selectorAngle / 6);
					var m = -1;
					if (selectorLength < clockRadius + 10 && selectorLength > clockRadius - 40) {
						if (x - clockCenterX >= 0) {
							m = selectorAngle;
						} else if (x - clockCenterX < 0) {
							m = selectorAngle + 30;
							if (m == 60) m = 0;
						}
					}
					if (m > -1) {
						if (settings.precision != 1) {
							var f = Math.floor(m / settings.precision);
							m = f * settings.precision + (Math.round((m - f * settings.precision) / settings.precision) == 1 ? settings.precision : 0);
							if (m >= 60) m = 0;
						}
						var newVal = (negative ? '-' : '') + (hour < 10 && !settings.duration ? '0' : '') + hour + settings.separator + (m < 10 ? '0' : '') + m;
						var isMinMaxFullfilled = true;
						if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) isMinMaxFullfilled = false;
						if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) isMinMaxFullfilled = false;
						if ((isDragging || clicked) && isMinMaxFullfilled) {
							var oldVal = inputElement.val();
							if (newVal != oldVal) {
								if (settings.vibrate) navigator.vibrate(10);
								settings.onAdjust(newVal, oldVal);
							}
							inputElement.val(newVal);
						}
						repaintClockMinuteCanvas(m == 0 ? 60 : m, settings.duration && settings.durationNegative && selectorLength <= 12);
						return true;
					}
					else {
						repaintClockMinuteCanvas(null, settings.duration && settings.durationNegative && selectorLength <= 12);
						return false;
					}
				}
			}
			
			
			
			/************************************************************************************************
			  REPAINTS THE CORRESPONDING CLOCK CANVAS DEPENDING ON CURRENT SELECTION MODE
			 ************************************************************************************************/
			function repaintClock() {
				if (selectionMode == 'HOUR') {
					repaintClockHourCanvas();
				} else {
					repaintClockMinuteCanvas();
				}
			}
			
			
			
			/************************************************************************************************
			  REPAINTS THE SIGN BUTTON (used by repaintClockHourCanvas and repaintClockMinuteCanvas)
			 ************************************************************************************************/
			function repaintSignButton(ctx, hover) {
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, 12, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.signButtonBackgroundColor;
				ctx.fill();
				if (hover) {
					ctx.beginPath();
					ctx.arc(clockCenterX, clockCenterY, 14, 0, 2 * Math.PI, false);
					ctx.strokeStyle = settings.colors.signButtonBackgroundColor;
					ctx.stroke();
				}
				ctx.beginPath();
				ctx.moveTo(clockCenterX - 6, clockCenterY);
				ctx.lineTo(clockCenterX + 6, clockCenterY);
				ctx.lineWidth = 2;
				ctx.strokeStyle = settings.colors.signButtonColor;
				ctx.stroke();
				if (!inputElement.val().match(/^-/)) {
					ctx.beginPath();
					ctx.moveTo(clockCenterX, clockCenterY - 6);
					ctx.lineTo(clockCenterX, clockCenterY + 6);
					ctx.lineWidth = 2;
					ctx.strokeStyle = settings.colors.signButtonColor;
					ctx.stroke();
				}
			}
			
			
			
			/************************************************************************************************
			  REPAINTS THE CLOCK HOUR CANVAS
			 ************************************************************************************************/
			function repaintClockHourCanvas(hoverHour, hoverSign) {
				
				var ctx = clockHourCanvas.get(0).getContext('2d');
				(new RegExp('^(-)?([0-9]+).([0-9]{1,2})$')).test(inputElement.val());
				var negative = RegExp.$1 == '-' ? true : false;
				var hour = parseInt(RegExp.$2);
				
				ctx.clearRect(0, 0, canvasSize, canvasSize);
				
				if (hour >= 24) {
					popup.css('visibility', 'hidden');
					return;
				} else {
					if (!settings.onlyShowClockOnMobile) popup.css('visibility', 'visible');
				}
				
				if (hour == 0) hour = 24;
				if (!inputElement.val()) hour = -1;
				
				//Paint clock circle				
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.clockFaceColor;
				ctx.fill();
				
				//Paint hover (if available)
				if (!isMobile() && hoverHour) {
					var isMinMaxFullfilled = true;
					if (settings.maximum && !isTimeSmallerOrEquals((negative ? '-' : '') + (hoverHour == 24 ? '00' : hoverHour) + ':00', settings.maximum)) isMinMaxFullfilled = false;
					if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + (hoverHour == 24 ? '00' : hoverHour) + ':00')) isMinMaxFullfilled = false;
					if (isMinMaxFullfilled) {
						ctx.beginPath();
						ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((hoverHour % 12) - 3)) * (hoverHour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
								clockCenterY + Math.sin(Math.PI / 6 * ((hoverHour % 12) - 3)) * (hoverHour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
								15, 0, 2 * Math.PI, false);
						ctx.fillStyle = settings.colors.hoverCircleColor;
						ctx.fill();
					}
				}
				
				//Paint hour selector
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, 3, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.selectorColor;
				ctx.fill();
				if (hour > -1 && (!settings.maximum || hour == 24 || isTimeSmallerOrEquals(hour, settings.maximum))) {
					ctx.beginPath();
					ctx.moveTo(clockCenterX, clockCenterY);
					ctx.lineTo(clockCenterX + Math.cos(Math.PI / 6 * ((hour % 12) - 3)) * (hour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
							   clockCenterY + Math.sin(Math.PI / 6 * ((hour % 12) - 3)) * (hour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)));
					ctx.lineWidth = 1;
					ctx.strokeStyle = settings.colors.selectorColor;
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((hour % 12) - 3)) * (hour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
							clockCenterY + Math.sin(Math.PI / 6 * ((hour % 12) - 3)) * (hour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
							15, 0, 2 * Math.PI, false);
					ctx.fillStyle = settings.colors.selectorColor;
					ctx.fill();
				}
				
				//Paint hour numbers in outer circle
				ctx.font = settings.fonts.clockOuterCircleFontSize + 'px ' + settings.fonts.fontFamily;
				for(i = 1; i <= 12; i++) {
					var angle = Math.PI / 6 * (i - 3);
					var s = i;
					if (settings.afternoonHoursInOuterCircle) {
						s = i + 12;
						if (hour == i + 12) ctx.fillStyle = settings.colors.selectorNumberColor;
						else ctx.fillStyle = settings.colors.clockInnerCircleTextColor;
						if (s == 24) s = '00';
					} else {
						if (hour == i) ctx.fillStyle = settings.colors.selectorNumberColor;
						else ctx.fillStyle = settings.colors.clockOuterCircleTextColor;
					}
					if ((!settings.maximum || isTimeSmallerOrEquals((negative ? '-' : '') + s + ':00', settings.maximum)) && (!settings.minimum || isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + s + ':00'))) {
						ctx.fillText(s,
								 clockCenterX + Math.cos(angle) * clockOuterRadius - (ctx.measureText(s).width / 2),
								 clockCenterY + Math.sin(angle) * clockOuterRadius + (settings.fonts.clockOuterCircleFontSize / 3));
					}
				}
				
				//Paint hour numbers in inner circle
				ctx.font = settings.fonts.clockInnerCircleFontSize + 'px ' + settings.fonts.fontFamily;
				for(i = 1; i <= 12; i++) {
					var angle = Math.PI / 6 * (i - 3);
					var s = i;
					if (!settings.afternoonHoursInOuterCircle) {
						s = i + 12;
						if (hour == i + 12) ctx.fillStyle = settings.colors.selectorNumberColor;
						else ctx.fillStyle = settings.colors.clockInnerCircleTextColor;
						if (s == 24) s = '00';
					} else {
						if (hour == i) ctx.fillStyle = settings.colors.selectorNumberColor;
						else ctx.fillStyle = settings.colors.clockOuterCircleTextColor;
					}					
					if ((!settings.maximum || isTimeSmallerOrEquals((negative ? '-' : '') + s + ':00', settings.maximum)) && (!settings.minimum || isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + s + ':00'))) {
						ctx.fillText(s,
								 clockCenterX + Math.cos(angle) * clockInnerRadius - (ctx.measureText(s).width / 2),
								 clockCenterY + Math.sin(angle) * clockInnerRadius + (settings.fonts.clockInnerCircleFontSize / 3));
					}
				}
				
				if (settings.duration && settings.durationNegative) repaintSignButton(ctx, hoverSign);
			}
			
			
			
			/************************************************************************************************
			  REPAINTS THE CLOCK MINUTE CANVAS
			 ************************************************************************************************/
			function repaintClockMinuteCanvas(hoverMinute, hoverSign) {
				
				var ctx = clockMinuteCanvas.get(0).getContext('2d');				
				(new RegExp('^(-)?([0-9]+).([0-9]{1,2})$')).test(inputElement.val());
				var negative = RegExp.$1 == '-' ? true : false;
				var hour = parseInt(RegExp.$2);
				var min = parseInt(RegExp.$3);
				if (!inputElement.val()) min = -1;
				
				if (!settings.onlyShowClockOnMobile) popup.css('visibility', 'visible');
				
				//Paint clock circle				
				ctx.clearRect(0, 0, canvasSize, canvasSize);
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.clockFaceColor;
				ctx.fill();
				
				//Paint hover (if available)
				if (!isMobile() && hoverMinute) {
					if (hoverMinute == 60) hoverMinute = 0;
					var isMinMaxFullfilled = true;
					if (settings.maximum && !isTimeSmallerOrEquals((negative ? '-' : '') + hour + ':' + (hoverMinute < 10 ? '0' : '') + hoverMinute, settings.maximum)) isMinMaxFullfilled = false;
					if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + hour + ':' + (hoverMinute < 10 ? '0' : '') + hoverMinute)) isMinMaxFullfilled = false;
					if (isMinMaxFullfilled) {
						ctx.beginPath();
						ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((hoverMinute / 5) - 3)) * clockOuterRadius,
								clockCenterY + Math.sin(Math.PI / 6 * ((hoverMinute / 5) - 3)) * clockOuterRadius,
								15, 0, 2 * Math.PI, false);
						ctx.fillStyle = settings.colors.hoverCircleColor;
						ctx.fill();
					}
				}
				
				//Paint minute selector
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, 3, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.selectorColor;
				ctx.fill();
				if (min > -1 && (!settings.maximum || isTimeSmallerOrEquals(hour + ':' + min, settings.maximum)) && (!settings.minimum || isTimeSmallerOrEquals(settings.minimum, hour + ':' + min))) {
					ctx.beginPath();
					ctx.moveTo(clockCenterX, clockCenterY);
					ctx.lineTo(clockCenterX + Math.cos(Math.PI / 6 * ((min / 5) - 3)) * clockOuterRadius,
							   clockCenterY + Math.sin(Math.PI / 6 * ((min / 5) - 3)) * clockOuterRadius);
					ctx.lineWidth = 1;
					ctx.strokeStyle = settings.colors.selectorColor;
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((min / 5) - 3)) * clockOuterRadius,
							clockCenterY + Math.sin(Math.PI / 6 * ((min / 5) - 3)) * clockOuterRadius,
							15, 0, 2 * Math.PI, false);
					ctx.fillStyle = settings.colors.selectorColor;
					ctx.fill();
				}
				
				//Paint minute numbers 00 - 55
				ctx.font = settings.fonts.clockOuterCircleFontSize + 'px ' + settings.fonts.fontFamily;
				for(i = 1; i <= 12; i++) {
					if (Math.floor(i * 5 / settings.precision) != i * 5 / settings.precision) continue;
					var angle = Math.PI / 6 * (i - 3);
					if (min == i * 5 || (min == 0 && i == 12)) ctx.fillStyle = settings.colors.selectorNumberColor;
					else ctx.fillStyle = settings.colors.clockOuterCircleTextColor;
					var s = i * 5 == 5 ? '05' : i * 5;
					if (s == 60) s = '00';
					var isMinMaxFullfilled = true;
					if (settings.maximum && !isTimeSmallerOrEquals((negative ? '-' : '') + hour + ':' + s, settings.maximum)) isMinMaxFullfilled = false;
					if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + hour + ':' + s)) isMinMaxFullfilled = false;
					if (isMinMaxFullfilled) {
						ctx.fillText(s,
								 clockCenterX + Math.cos(angle) * clockOuterRadius - (ctx.measureText(s).width / 2),
								 clockCenterY + Math.sin(angle) * clockOuterRadius + (settings.fonts.clockOuterCircleFontSize / 3));
					}
				}
				
				//For numbers not dividable by 5 paint a little white dot in the selector circle
				if (min > -1 && min % 5 != 0) {
					ctx.beginPath();
					ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((min / 5) - 3)) * clockOuterRadius,
							clockCenterY + Math.sin(Math.PI / 6 * ((min / 5) - 3)) * clockOuterRadius,
							2, 0, 2 * Math.PI, false);
					ctx.fillStyle = 'white';
					ctx.fill();
				}
				
				if (settings.duration && settings.durationNegative) repaintSignButton(ctx, hoverSign);
			}
			
			
			
			/************************************************************************************************
			  SHOWS THE TIME PICKER
			 ************************************************************************************************/	
			function showTimePicker() {
				inputElement.val(element.val());				
				repaintClockHourCanvas();
				switchToHourMode(true);
				if (!isMobile() && settings.onlyShowClockOnMobile) popup.css('visibility', 'hidden');
				popup.css('display', 'block');
				if (isMobile()) {
					background.stop().css('opacity', 0).css('display', 'block').animate({opacity: 1}, 300);
				} else {
					//Adjust popup's position horizontally
					if (popup.outerWidth() > element.outerWidth()) {
						var moveToLeft = parseInt((popup.outerWidth() - element.outerWidth()) / 2);
						if (moveToLeft < element.offset().left) {
							popup.css('left', -moveToLeft + 'px');
						}
					}
					//Adjust popup's position vertically
					var freeTopSpace = element.offset().top - $(window).scrollTop();
					var freeBottomSpace = window.innerHeight - freeTopSpace - element.outerHeight();
					if (freeBottomSpace < popup.outerHeight() && element.offset().top > popup.outerHeight()) {
						if (freeTopSpace < popup.outerHeight()) {
							if (freeTopSpace > freeBottomSpace + element.outerHeight()) {
								popup.css('top', -popup.outerHeight() + 'px');
							} else {
								popup.css('top', element.outerHeight() + 'px');
							}
						} else {
							popup.css('top', -popup.outerHeight() + 'px');
						}
					} else {
						popup.css('top', element.outerHeight() + 'px');
					}
				}
				settings.onOpen();
			}
			
			
			
			/************************************************************************************************
			  HIDES THE TIME PICKER
			 ************************************************************************************************/
			function hideTimePicker() {
				var newValue = formatTime(element.val());
				enteredDigits = '';
				popup.css('display', 'none');
				if (isMobile()) {
					background.stop().animate({opacity: 0}, 300, function() { background.css('display', 'none'); });
				} else {
					element.val(newValue);
				}
				if (oldValue != newValue) {
					if ('createEvent' in document) {
						var evt = document.createEvent('HTMLEvents');
						evt.initEvent('change', true, false);
						element.get(0).dispatchEvent(evt);
					}
					else {
						var evt = document.createEventObject();
						evt.eventType = 'click';
						element.get(0).fireEvent('onchange', evt);
					}
					settings.onChange(newValue, oldValue);
					oldValue = newValue;
				}
				settings.onClose();
			}
			
			
			
			/************************************************************************************************
			  SWITCH FROM MINUTE SELECTION MODE TO HOUR SELECTION MODE
			 ************************************************************************************************/
			function switchToHourMode(surpressAnimation) {
				if (selectionMode == 'HOUR') return;
				enteredDigits = '';
				repaintClockHourCanvas();
				if (surpressAnimation) {
					clockMinuteCanvas.css('display', 'none');
				}
				else {
					clockMinuteCanvas.css('zIndex', 2).stop().animate({opacity: 0, zoom:'80%', left:'10%', top:'10%'}, settings.modeSwitchSpeed, function() {
						clockMinuteCanvas.css('display', 'none');
					});
				}
				clockHourCanvas.stop().css('zoom', '100%')
									  .css('left', '0px')
									  .css('top', '0px')
									  .css('display', 'block')
									  .css('opacity', 1)
									  .css('zIndex', 1);
				selectionMode = 'HOUR';
				settings.onModeSwitch(selectionMode);
			}
			
			
			
			/************************************************************************************************
			  SWITCH FROM HOUR SELECTION MODE TO MINUTE SELECTION MODE
			 ************************************************************************************************/
			function switchToMinuteMode() {
				if (selectionMode == 'MINUTE') return;
				enteredDigits = '';
				repaintClockMinuteCanvas();
				clockMinuteCanvas.stop().css('display', 'block')
										.css('zoom', '80%')
										.css('left', '10%')
										.css('top', '10%')										
										.css('opacity', 0)
										.css('zIndex', 1)
										.animate({opacity: 1, zoom:'100%', left:'0px', top:'0px'});
				selectionMode = 'MINUTE';
				settings.onModeSwitch(selectionMode);
			}
			
			
			
			/************************************************************************************************
			  SELECT HOUR ON INPUT ELEMENT
			 ************************************************************************************************/
			function selectHourOnInputElement() {
				inputElement.focus();
				setTimeout(function() {
					inputElement.get(0).setSelectionRange(0, inputElement.val().indexOf(settings.separator));
				}, 1);
			}
			

			
			/************************************************************************************************
			  SELECT MINUTE ON INPUT ELEMENT
			 ************************************************************************************************/
			function selectMinuteOnInputElement() {
				inputElement.focus();
				setTimeout(function() {						
					inputElement.get(0).setSelectionRange(inputElement.val().indexOf(settings.separator) + 1, inputElement.val().length);
				}, 1);
			}
			
			
			
			/************************************************************************************************
			  AUTOSIZE INPUT ELEMENT
			 ************************************************************************************************/
			function autosize() {
				if (!settings.autosize) return;
				tempAutosizeElement.html(element.val());
				element.css('width', (tempAutosizeElement.outerWidth() + 2) + 'px');
			}
			
			
			
			/************************************************************************************************
			  FORMATS THE TIME
			 ************************************************************************************************/	
			function formatTime(time) {
				if (time == '') {
					if (settings.required) return settings.duration ? '0:00' : '00:00';
					else return time;
				}
				if ((new RegExp('^(-)?([0-9]+)(.([0-9]{1,2}))?$', 'i')).test(time)) {
					var hour = parseInt(RegExp.$2);
					var min = parseInt(RegExp.$4);
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					if (hour >= 24 && !settings.duration) hour = hour % 24;
					if (min >= 60) min = min % 60;
					if (settings.precision != 1) {
						var f = Math.floor(min / settings.precision);
						min = f * settings.precision + (Math.round((min - f * settings.precision) / settings.precision) == 1 ? settings.precision : 0);
						if (min >= 60) min = 0;
					}
					time = (negative ? '-' : '') + (hour < 10 && !settings.duration ? '0' : '') + hour + settings.separator + (RegExp.$3 ? (min < 10 ? '0' : '') + min : '00');
				}
				else if ((new RegExp('^(-)?.([0-9]{1,2})')).test(time)) {
					var min = parseInt(RegExp.$2);
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					if (min >= 60) min = min % 60;
					time = (negative && min > 0 ? '-' : '') + '0' + (!settings.duration ? '0' : '') + settings.separator + (min < 10 ? '0' : '') + min;
				}
				else {
					time = '0' + (!settings.duration ? '0' : '') + settings.separator + '00';
				}
				return time;
			}
			
			
			
			/************************************************************************************************
			  DISPOSES AN INITIALIZED CLOCK TIME PICKER
			 ************************************************************************************************/
			function disposeTimePicker(element) {
				element.parent().find('.clock-timepicker-autosize').remove();
				element.parent().find('.clock-timepicker-background').remove();
				element.parent().find('.clock-timepicker-popup').remove();
				element.unwrap();
				element.off('drag.clockTimePicker dragend.clockTimePicker dragover.clockTimePicker dragenter.clockTimePicker dragstart.clockTimePicker dragleave.clockTimePicker drop.clockTimePicker selectstart.clockTimePicker contextmenu.clockTimePicker');
				element.off('mousedown.clockTimePicker');
				element.off('keyup.clockTimePicker');
				element.off('keydown.clockTimePicker');
				element.off('mousewheel.clockTimePicker');
				element.off('focus.clockTimePicker');				
				if (element.attr('data-autocomplete-orig')) {
					element.attr('autocomplete', element.attr('data-autocomplete-orig'));
					element.removeAttr('data-autocomplete-orig');
				} else element.removeAttr('autocomplete');
				if (element.attr('data-autocorrect-orig')) {
					element.attr('autocorrect', element.attr('data-autocorrect-orig'));
					element.removeAttr('data-autocorrect-orig');
				} else element.removeAttr('autocorrect');
				if (element.attr('data-autocapitalize-orig')) {
					element.attr('autocapitalize', element.attr('data-autocapitalize-orig'));
					element.removeAttr('data-autocapitalize-orig');
				} else element.removeAttr('autocapitalize');
				if (element.attr('data-spellcheck-orig')) {
					element.attr('spellcheck', element.attr('data-spellcheck-orig'));
					element.removeAttr('data-spellcheck-orig');
				} else element.removeAttr('spellcheck');
			}	
			
			
			
			/************************************************************************************************
			  ELEMENT EVENTS
			 ************************************************************************************************/
			function onInputElementMouseWheel(event) {
				if (element.is(":focus")) processMouseWheelEvent(event);
			}
			
			
			function onInputElementFocus(event) {
				if (popup.css('display') == 'none') {
					hasJustGotFocus = true;
					setTimeout(function() {
						hasJustGotFocus = false;
					}, 300);
					showTimePicker();
					selectHourOnInputElement();
				}
			}
			
			
			function onInputElementDragSelectContextMenu(event) {
				event.stopImmediatePropagation();
				event.preventDefault();
				return false;
			}
			
			
			function onInputElementMouseDown(event) {
				inputElement.trigger('focus');
				processClick(event);
				event.stopImmediatePropagation();
				event.stopPropagation();
				event.preventDefault();
				return false;
			}
			
			
			function onInputElementKeyDown(event) {
				//TABULATOR
				if (event.keyCode == 9) {
					hideTimePicker();
				}
				//ENTER
				else if (event.keyCode == 13) {
					hideTimePicker();					
					blurAll();
				}
				//ESC
				else if (event.keyCode == 27) {
					inputElement.val(oldValue);
					hideTimePicker();
					blurAll();
				}
				//BACKSPACE OR DELETE
				else if (event.keyCode == 8 || event.keyCode == 46) {
					enteredDigits = '';
					if (!inputElement.val()) return false;
					var oldVal = inputElement.val();
					var newVal;
					event.preventDefault();
					(new RegExp('^(-)?([0-9]+)(.([0-9]{1,2}))?$')).test(inputElement.val());
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					var h = parseInt(RegExp.$2);
					var m = RegExp.$4 ? parseInt(RegExp.$4) : 0;
					if (selectionMode == 'HOUR') {
						if (h == 0) {
							newVal = settings.required ? (!settings.duration ? '0' : '') +'0' + settings.separator + '00' : '';
						} else {
							newVal = (!settings.duration ? '0' : '') + '0' + settings.separator + (m < 10 ? '0' : '') + m;
						}
						inputElement.val(newVal);
						selectHourOnInputElement();
						if (oldVal != newVal) settings.onAdjust(newVal, oldVal);
					} else {
						if (m == 0) {
							if (h == 0 && !settings.required) {
								inputElement.val('');
								if (oldVal != '') settings.onAdjust('', oldVal);
							}
							switchToHourMode();
							selectHourOnInputElement();
						} else {
							newVal = (negative ? '-' : '') + (h < 10 && !settings.duration ? '0' : '') + h + settings.separator + '00';
							inputElement.val(newVal);
							selectMinuteOnInputElement();
							if (oldVal != newVal) settings.onAdjust(newVal, oldVal);
						}
					}
					autosize();
				}
				//ARROW LEFT OR HOME
				else if ((event.keyCode == 36 || event.keyCode == 37) && inputElement.val() != '') {
					inputElement.val(formatTime(inputElement.val()));
					if (selectionMode != 'HOUR') {
						selectHourOnInputElement();
						switchToHourMode();
					} else {
						event.preventDefault();
						event.stopPropagation();
					}
				}
				//ARROW RIGHT OR END
				else if ((event.keyCode == 35 || event.keyCode == 39) && inputElement.val() != '') {
					inputElement.val(formatTime(inputElement.val()));
					if (settings.precision != 60 && selectionMode != 'MINUTE') {
						selectMinuteOnInputElement();
						switchToMinuteMode();
					} else {
						event.preventDefault();
						event.stopPropagation();
					}
				}
				//COLON OR DOT
				else if (event.keyCode == 190 || event.key == settings.separator) {
					event.preventDefault();
					if (inputElement.val().length == 0) inputElement.val('0');
					inputElement.val(formatTime(inputElement.val()));
					if (settings.precision != 60) {
						selectMinuteOnInputElement();
						if (selectionMode != 'MINUTE') switchToMinuteMode();
					} else {
						selectHourOnInputElement();
					}
				}
				//ARROW UP OR DOWN, + OR -
				else if (event.keyCode == 38 || event.keyCode == 40 || event.keyCode == 107 || event.keyCode == 109 || event.keyCode == 189 || (event.shiftKey && event.keyCode == 49)) {
					event.preventDefault();
					if (oldValue == '') return;
					var oldVal = inputElement.val();
					(new RegExp('^(-)?([0-9]+)(.([0-9]{1,2}))?$')).test(inputElement.val());
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					var h = parseInt(RegExp.$2);
					if (negative) h = -h;
					var m = RegExp.$4 ? parseInt(RegExp.$4) : 0;
					if (settings.duration && settings.durationNegative && (event.keyCode == 107 || event.keyCode == 109 || event.keyCode == 189 || (event.shiftKey && event.keyCode == 49))) {
						if (event.keyCode == 109 || event.keyCode == 189) {
							if (h > 0) h = -h;
							negative = true;
						}
						else if (h <= 0) {
							h = -h;
							negative = false;
						}
						enteredDigits = '';
					}
					else if (selectionMode == 'HOUR') {
						if (event.keyCode == 38 || event.keyCode == 109 || event.keyCode == 189) {
							if (settings.duration && settings.durationNegative && h == 0 && negative) negative = false;
							else h += 1;
						}
						else {							
							if (settings.duration && settings.durationNegative && h == 0 && !negative) negative = true;
							else h -= 1;
						}
						if (h == -1) {
							if (!settings.duration) h = 23;
							else if (!settings.durationNegative) h = 0;
						}
						if (h == 24 && !settings.duration) h = 0;
					}
					else {
						if (event.keyCode == 38 || event.keyCode == 109 || event.keyCode == 189) m -= settings.precision;
						else m += settings.precision;
						if (m < 0) m = 60 + m;
						if (m >= 60) m = m - 60;
					}
					var newVal = (h < 10 && !settings.duration ? '0': '') + (negative && h == 0 ? '-' + h : h) + settings.separator + (m < 10 ? '0' : '') + m;
					var isMinMaxFullfilled = true;
					if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) isMinMaxFullfilled = false;
					if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) isMinMaxFullfilled = false;
					if (!isMinMaxFullfilled && selectionMode == 'HOUR') {
						if (event.keyCode == 38) newVal = formatTime(settings.maximum);
						else newVal = formatTime(settings.minimum);
						isMinMaxFullfilled = true;
					}
					if (isMinMaxFullfilled) {
						inputElement.val(newVal);
						if (newVal != oldVal) settings.onAdjust(newVal, oldVal);
						autosize();
						repaintClock();
						if (selectionMode == 'HOUR') selectHourOnInputElement();
						else selectMinuteOnInputElement();
					}
				}
				else {
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
					return false;
				}
			}
			
			
			function onInputElementKeyUp(event) {
				//on entering digits...
				if (event.keyCode >= 48 && event.keyCode <= 57 && !event.shiftKey && !event.ctrlKey && !event.altKey) {
					var hourPart = inputElement.val().replace(/.[0-9]+$/, '');
					var minPart = inputElement.val().replace(/^-?[0-9]+./, '');
					var isNegative = inputElement.val()[0] == '-';
					var oldVal = inputElement.val();
					var newVal;
					
					//entering first digit...
					if (enteredDigits == '') {
						enteredDigits = event.key;
						//First digit in hour mode
						if (selectionMode == 'HOUR') {
							newVal = (isNegative ? '-' : '') + (!settings.duration ? '0' : '') + event.key + settings.separator + minPart;							
							if (settings.maximum) {
								if (!isTimeSmallerOrEquals(newVal, settings.maximum)) {
									newVal = settings.maximum.substring(0, settings.maximum.indexOf(':')) + settings.separator + minPart;
									if (!isTimeSmallerOrEquals(newVal, settings.maximum)) {											
										newVal = settings.maximum;
									}
									newVal = formatTime(newVal);
									switchToMinutes = true;
								} else if (!isTimeSmallerOrEquals((isNegative ? '-' : '') + enteredDigits + '0' + settings.separator + minPart, settings.maximum)) {
									switchToMinutes = true;
								}
							}
							if (settings.minimum) {
								if (!isTimeSmallerOrEquals(settings.minimum, newVal)) {
									newVal = settings.minimum.substring(0, settings.minimum.indexOf(':')) + settings.separator + minPart;
									if (!isTimeSmallerOrEquals(settings.minimum, newVal)) {											
										newVal = settings.minimum;
									}
									newVal = formatTime(newVal);
									switchToMinutes = true;
								} else if (!isTimeSmallerOrEquals(settings.minimum, (isNegative ? '-' : '') + enteredDigits + '0' + settings.separator + minPart)) {
									switchToMinutes = true;
								}
							}							
							inputElement.val(newVal);
							var switchToMinutes = (!settings.duration && parseInt(event.key) > 2) || (settings.maximum && !isTimeSmallerOrEquals((isNegative ? '-' : '') + parseInt(event.key) + '0:00', settings.maximum)) || (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, (isNegative ? '-' : '') + parseInt(event.key) + '0:00'));
							if (switchToMinutes) {
								enteredDigits = '';
								switchToMinuteMode();
								selectMinuteOnInputElement();
							} else {
								selectHourOnInputElement();
							}
						}
						//First digit in minute mode
						else {
							if (parseInt(event.key) > 5) {
								newVal = formatTime(hourPart + settings.separator + '0' + event.key);
								if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) {
									newVal = formatTime(settings.maximum);
									inputElement.val(newVal);
									enteredDigits = '';
								}
								else if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) {
									newVal = formatTime(settings.minimum);
									inputElement.val(newVal);
									enteredDigits = '';
								}
								else {
									inputElement.val(newVal);
									hideTimePicker();
									blurAll();
								}
							} else {
								newVal = formatTime(hourPart + settings.separator + event.key + '0');
								if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) {
									newVal = formatTime(settings.maximum);
									enteredDigits = '';
								}
								if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) {
									newVal = formatTime(settings.minimum);
									enteredDigits = '';
								}
								inputElement.val(newVal);
								selectMinuteOnInputElement();
							}
						}
					}
					
					//entering second digit...
					else {
						if (!settings.duration) {
							//Second digit in hour mode (for normal clock)
							if (selectionMode == 'HOUR') {
								var number = parseInt(enteredDigits + event.key);
								var topNumber = selectionMode == 'HOUR' ? 24 : 60;
								if (number == topNumber) {
									enteredDigits = '';
									newVal = '00' + settings.separator + minPart;
									inputElement.val(newVal);
									if (settings.precision == 60) {
										hideTimePicker();
										blurAll();
									} else {
										switchToMinuteMode();
										selectMinuteOnInputElement();
									}
								}
								else if (number > topNumber) {
									enteredDigits = event.key;
									newVal = '0' + enteredDigits + settings.separator + minPart;
									inputElement.val(newVal);
									selectHourOnInputElement();
								}
								else {
									newVal = enteredDigits + event.key + settings.separator + minPart;
									inputElement.val(newVal);
									if (settings.precision == 60) {
										hideTimePicker();
										blurAll();
									} else {
										switchToMinuteMode();
										selectMinuteOnInputElement();
										enteredDigits = '';
									}
								}
							}
							//Second digit in minute mode (for normal clock)
							else {
								newVal = hourPart + settings.separator + enteredDigits + event.key;
								inputElement.val(newVal);
								hideTimePicker();
								blurAll();
							}
						} else {
							
							if (enteredDigits == '0') enteredDigits = '';
							
							//Second digit in minute mode (for duration)
							if (selectionMode == 'MINUTE') {
								newVal = hourPart + settings.separator + enteredDigits + event.key;
								if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) {
									newVal = formatTime(settings.maximum);
									inputElement.val(newVal);
									enteredDigits = '';
								}
								else if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) {
									newVal = formatTime(settings.minimum);
									inputElement.val(newVal);
									enteredDigits = '';
								}
								else {
									inputElement.val(newVal);
									hideTimePicker();
									blurAll();
								}
							}
							//Second digit in hour mode (for duration)
							else {
								enteredDigits += event.key;
								newVal = (isNegative ? '-' : '') + enteredDigits + settings.separator + minPart;
								var switchToMinutes = false;
								if (settings.maximum) {
									if (!isTimeSmallerOrEquals(newVal, settings.maximum)) {
										newVal = settings.maximum.substring(0, settings.maximum.indexOf(':')) + settings.separator + minPart;
										if (!isTimeSmallerOrEquals(newVal, settings.maximum)) {											
											newVal = settings.maximum;
										}
										newVal = formatTime(newVal);
										switchToMinutes = true;
									} else if (!isTimeSmallerOrEquals((isNegative ? '-' : '') + enteredDigits + '0' + settings.separator + minPart, settings.maximum)) {
										switchToMinutes = true;
									}
								}
								if (settings.minimum) {
									if (!isTimeSmallerOrEquals(settings.minimum, newVal)) {
										newVal = settings.minimum.substring(0, settings.minimum.indexOf(':')) + settings.separator + minPart;
										if (!isTimeSmallerOrEquals(settings.minimum, newVal)) {											
											newVal = settings.minimum;
										}
										newVal = formatTime(newVal);
										switchToMinutes = true;
									} else if (!isTimeSmallerOrEquals(settings.minimum, (isNegative ? '-' : '') + enteredDigits + '0' + settings.separator + minPart)) {
										switchToMinutes = true;
									}
								}
								inputElement.val(newVal);
								if (!switchToMinutes) selectHourOnInputElement();
								else {
									switchToMinuteMode();
									selectMinuteOnInputElement();
									enteredDigits = '';
								}
							}
						}
					}
					if (newVal != oldVal) settings.onAdjust(newVal, oldVal);
					autosize();
				}
				repaintClock();
			}
			
		});
				
		/************************************************************************************************
		  CHECKS IF THE DEVICE IS A MOBILE
		 ************************************************************************************************/	
		function isMobile() {
			var check = false;
			(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
			return check;
		}
		
		/************************************************************************************************
		  FUNCTION TO COMPARE TWO TIMES
		 ************************************************************************************************/
		function isTimeSmallerOrEquals(time1, time2) {
			var regex = '^(-)?([0-9]+)(.([0-9]{1,2}))?$';
			(new RegExp(regex, 'i')).test(time1);
			var t1 = parseInt(RegExp.$2) * 60;
			if (RegExp.$4) t1 += parseInt(RegExp.$4);
			if (RegExp.$1 == '-') t1 *= -1;
			(new RegExp(regex, 'i')).test(time2);
			var t2 = parseInt(RegExp.$2) * 60;
			if (RegExp.$4) t2 += parseInt(RegExp.$4);
			if (RegExp.$1 == '-') t2 *= -1;
			if (t1 <= t2) return true;
			else return false;
		}
	};	
}(jQuery));
