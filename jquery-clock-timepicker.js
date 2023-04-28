/*
 * Author:  Andreas Loeber
 * Plugin:  jquery-clock-timerpicker
 * Version: 2.6.4
 */
 (function($) {

	$.fn.clockTimePicker = function(options, _value) {
		if (typeof options == 'string' && (options == 'value' || options == 'val') && !_value) return $(this).val();

		/************************************************************************************************
		  DEFAULT SETTINGS (CAN BE OVERRIDDEN WITH THE OPTIONS ARGUMENT)
		************************************************************************************************/
		var settings = $.extend(true, {
			afternoonHoursInOuterCircle: false,
			alwaysSelectHoursFirst: false,
			autosize: false,
			contextmenu: false,
			colors: {
				buttonTextColor: '#0797FF',
				clockFaceColor: '#EEEEEE',
				clockInnerCircleTextColor: '#888888',
				clockInnerCircleUnselectableTextColor: '#CCCCCC',
				clockOuterCircleTextColor: '#000000',
				clockOuterCircleUnselectableTextColor: '#CCCCCC',
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
			hideUnselectableNumbers: false,
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
			useDurationPlusSign: false,
			vibrate: true
		}, typeof options == 'object' ? options : {});


		/************************************************************************************************
		  DYNAMICALLY INSERT CSS CODE FOR SELECTION ON MOBILE
		 ************************************************************************************************/
		var css = '.clock-timepicker input { caret-color: transparent; }';
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

			var element = $(this);

			//Adjust settings by data attributes
			var dataOptions = {}, _data = element.data();
			for (var dataOption in _data) {
				if (settings.hasOwnProperty(dataOption)) {
					settings[dataOption] = _data[dataOption];
				}
			}

			//Validate settings
			validateSettings();

			//VIBRATION API
			if (!('vibrate' in navigator)) settings.vibrate = false;

			if (typeof options == 'string') {
				if (!$(this).parent().hasClass('clock-timepicker')) console.log('%c[jquery-clock-timepicker] Before calling a function, please initialize the ClockTimePicker!', 'color:red');
				else {
					options = options.toLowerCase();
					if (options == 'dispose') disposeTimePicker($(this));
					else if (options == 'value' || options == 'val') {
						$(this).val(formatTime(_value));
						var mobileInput = $(this).parent().find('.clock-timepicker-mobile-input');
						if (mobileInput.length > 0) mobileInput.val(formatTime(_value));
					}
					else if (options == 'show') {
						$(this).parent().find('canvas:first').trigger('keydown');
					}
					else if (options == 'hide') {
						$(this).parent().find('.clock-timepicker-popup').css('display', 'none');
						$(this).blur();
					}
					else console.log('%c[jquery-clock-timepicker] Invalid option passed to clockTimePicker: ' + options, 'color:red');
				}
				return;
			} else {
				if ($(this).parent().hasClass('clock-timepicker')) disposeTimePicker($(this));
			}



			/************************************************************************************************
			  INITIALIZE VARIABLES
			 ************************************************************************************************/
			element.val(formatTime(element.val()));
			if (isMobile()) element.prop('readonly', true);
			var oldValue = element.val();
			var enteredDigits = '';
			var selectionMode = 'HOUR'; //2 modes: 'HOUR' or 'MINUTE'
			var isDragging = false;
			var touchSignButton = false;
			var popupWidth = isMobile() ? $(document).width() - 80 : settings.popupWidthOnDesktop;
			var canvasSize = popupWidth - (isMobile() ? 50 : 20);
			var clockRadius = parseInt(canvasSize / 2);
			var clockCenterX = parseInt(canvasSize / 2);
			var clockCenterY = parseInt(canvasSize / 2);
			var clockOuterRadius = clockRadius - 16;
			var clockInnerRadius = clockOuterRadius - 29;
			var isTimeChanged = false;
			var lastMouseWheelTimestamp = 0;



			/************************************************************************************************
			  INITIALIZE A NEW PARENT ELEMENT THAT ENCAPSULATES THE INPUT FIELD
			 ************************************************************************************************/
			element.wrap('<div class="clock-timepicker" style="display:inline-block; position:relative">');



			/************************************************************************************************
			  TEMPORARY AUTOSIZE ELEMENT
			 ************************************************************************************************/
			var tempAutosizeElement = $('<div class="clock-timepicker-autosize">');
			tempAutosizeElement.css('position', 'absolute')
							   .css('opacity', 0)
							   .css('display', 'none')
							   .css('top', parseInt(element.css('margin-top')) + 'px')
							   .css('left', '0px')
							   .css('font-size', element.css('font-size'))
							   .css('font-family', element.css('font-family'))
							   .css('font-weight', element.css('font-weight'))
							   .css('line-height', element.css('line-height'));
			element.parent().append(tempAutosizeElement);
			element.css('min-width', element.outerWidth());
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
				 .css('position', 'fixed')
				 .css('width', popupWidth + 'px')
				 .css('backgroundColor', settings.colors.popupBackgroundColor)
				 .css('box-shadow', '0 4px 20px 0px rgba(0, 0, 0, 0.14)')
				 .css('border-radius', '5px')
				 .css('overflow', 'hidden')
				 .css('user-select', 'none');
			popup.on('contextmenu', function() { return false; });
			if (isMobile()) {
				popup.css('left', '40px')
					 .css('top', '40px');

				window.addEventListener("orientationchange", function() {
					setTimeout(function() {
						adjustMobilePopupDimensionAndPosition();
						repaintClock();
					}, 500);
				});

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
				$(window).off('click.clockTimePicker', onWindowClick);
				$(window).on('click.clockTimePicker', onWindowClick);
			}



			/************************************************************************************************
			  INITIALIZE INPUT ELEMENT
			 ************************************************************************************************/
			var inputElement = element;
			if (isMobile()) {

				inputElement = $('<div class="clock-timepicker-mobile-time">');
				inputElement.css('width', '100%')
							.css('fontFamily', settings.fonts.fontFamily)
							.css('fontSize', '40px')
							.css('padding', '10px 0px')
							.css('textAlign', 'center')
							.css('color', settings.colors.popupHeaderTextColor)
							.css('backgroundColor', settings.colors.popupHeaderBackgroundColor);
				var inputElementHours = $('<span class="clock-timepicker-mobile-time-hours">');
				inputElement.append(inputElementHours);
				var inputElementSeparator = $('<span>');
				inputElementSeparator.html(settings.separator);
				inputElement.append(inputElementSeparator);
				var inputElementMinutes = $('<span class="clock-timepicker-mobile-time-minutes">');
				inputElement.append(inputElementMinutes);
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
			var clockHourCanvas = $('<canvas class="clock-timepicker-hour-canvas">');
			clockHourCanvas.css('cursor', 'default')
						   .css('position', 'absolute')
						   .css('top', '0px')
						   .css('left', '0px');
			clockHourCanvas.attr('width', canvasSize);
			clockHourCanvas.attr('height', canvasSize);
			registerDraggingEventsOnCanvas(clockHourCanvas);
			canvasHolder.append(clockHourCanvas);
			var clockMinuteCanvas = $('<canvas class="clock-timepicker-minute-canvas">');
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
				settings.fonts.fontFamily = settings.fonts.fontFamily.replace(/\"/g, "").replace(/\'/g, ""); //Prevents quotes in font to interfere
				var buttonHtml = '<a style="text-decoration:none; color:' + settings.colors.buttonTextColor + '; font-family:' + settings.fonts.fontFamily + '; font-size:' + settings.fonts.buttonFontSize + 'px; padding-left:30px">';
				var cancelButton = $(buttonHtml);
				cancelButton.html(settings.i18n.cancelButton);
				cancelButton.on('click', function() {
					hideTimePicker();
				});
				buttonArea.append(cancelButton);
				var okButton = $(buttonHtml);
				okButton.html(settings.i18n.okButton);
				okButton.on('click', function() {
					if (isMobile()) element.val(getInputElementValue());
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
				if (document.activeElement != inputElement.get(0)) return;
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
							var oldVal = getInputElementValue();
							if (oldVal.match(/^-/)) {
								newVal = oldVal.substring(1);
							} else {
								newVal = '-' + oldVal.replace(/^(-|\+)/, '');
							}
							if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) newVal = formatTime(settings.minimum);
							if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) newVal = formatTime(settings.maximum);
							setInputElementValue(formatTime(newVal));
							repaintClock();
							element.attr('value', newVal.replace(/^\+/, ''));
							settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
							if (selectionMode == 'HOUR') selectHourOnInputElement();
							else selectMinuteOnInputElement();
							return;
						}
						if (!processTimeSelection(x, y, true)) {
							if (settings.precision == 60) {
								hideTimePicker();
							} else if (selectionMode == 'HOUR') {
								switchToMinuteMode();
								selectMinuteOnInputElement();
							} else {
								hideTimePicker();
							}
							return false;
						}
						if (selectionMode == 'MINUTE' || settings.precision == 60) {
							hideTimePicker();
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
							var oldVal = getInputElementValue();
							if (oldVal.match(/^-/)) {
								newVal = oldVal.substring(1);
							} else {
								newVal = '-' + oldVal.replace(/^(-|\+)/, '');
							}
							if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, newVal)) newVal = formatTime(settings.minimum);
							if (settings.maximum && !isTimeSmallerOrEquals(newVal, settings.maximum)) newVal = formatTime(settings.maximum);
							setInputElementValue(formatTime(newVal));
							repaintClock();
							element.attr('value', newVal.replace(/^\+/, ''));
							settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
							if (selectionMode == 'HOUR') selectHourOnInputElement();
							else selectMinuteOnInputElement();
							return;
						}
						isDragging = true;
						processTimeSelection(x, y);
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

				canvas.on('keydown', function(event) {
					event.preventDefault();
					processTimeSelection();
					switchToHourMode();
					selectHourOnInputElement();
					oldValue = getInputElementValue();
				});
			}



			/************************************************************************************************
			  PROCESSES LEFT OR RIGHT MOUSE CLICK AND SINGLE TAP ON MOBILE PHONES
			 ************************************************************************************************/
			function processClick(event) {
				var popupVisible = popup.css('display') != 'none';
				if (!getInputElementValue()) {
					setInputElementValue(formatTime('00:00'));
					switchToHourMode(!popupVisible);
					selectHourOnInputElement();
				}
				else if (settings.precision == 60) {
					switchToHourMode(!popupVisible);
					selectHourOnInputElement();
				}
				else {
					var textDirection = inputElement.css('direction');
					if (!textDirection) textDirection = 'ltr';
					var textAlignment = inputElement.css('text-align');
					if (!textAlignment) textAlignment = 'left';
					var elementWidth = inputElement.innerWidth();
					var elementPaddingLeft = parseFloat(inputElement.css('padding-left'));
					var elementPaddingRight = parseFloat(inputElement.css('padding-right'));
					var elementInnerWidth = elementWidth - elementPaddingLeft - elementPaddingRight;
					tempAutosizeElement.css('display', 'inline-block');
					tempAutosizeElement.html(getInputElementValue());
					var textWidth = tempAutosizeElement.innerWidth();
					tempAutosizeElement.html(settings.separator);
					var textCenter = tempAutosizeElement.innerWidth() / 2;
					tempAutosizeElement.html(getInputElementValue().replace(new RegExp(settings.separator + '[0-9]+$'), ''));
					textCenter += tempAutosizeElement.innerWidth();
					tempAutosizeElement.css('display', 'none');
					var inputElementCenter = elementWidth / 2;
					if (textAlignment == 'left' || textAlignment == 'justify' || (textDirection == 'ltr' && textAlignment == 'start') || (textDirection == 'rtl' && textAlignment == 'end')) {
						inputElementCenter = Math.floor(elementPaddingLeft + textCenter);
					}
					else if (textAlignment == 'center') {
						inputElementCenter = Math.floor(elementPaddingLeft + ((elementInnerWidth - textWidth) / 2) + textCenter);
					}
					else if (textAlignment == 'right' || (textDirection == 'ltr' && textAlignment == 'end') || (textDirection == 'rtl' && textAlignment == 'start')) {
						inputElementCenter = Math.floor(elementPaddingLeft + elementInnerWidth - (textWidth - textCenter));
					}
					if (event.offsetX >= inputElementCenter - 2 && (popupVisible || !settings.alwaysSelectHoursFirst)) {
						if (selectionMode == 'HOUR' && settings.vibrate) navigator.vibrate(10);
						switchToMinuteMode(!popupVisible);
						selectMinuteOnInputElement();
					} else {
						if (selectionMode == 'MINUTE' && settings.vibrate) navigator.vibrate(10);
						switchToHourMode(!popupVisible);
						selectHourOnInputElement();
					}
				}
				if (!popupVisible) showTimePicker();
			}



			/************************************************************************************************
			  PROCESSES THE MOUSE WHEEL EVENT AND INCREASES OR DECREASES HOURS OR MINUTES
			 ************************************************************************************************/
			function processMouseWheelEvent(event) {
				var e = window.event || event;
				event.preventDefault();
				if (new Date().getTime() - lastMouseWheelTimestamp < 100) return;
				lastMouseWheelTimestamp = new Date().getTime();
				var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
				(new RegExp('^(-|\\+)?([0-9]+)(.([0-9]{1,2}))?$')).test(getInputElementValue());
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
				var oldVal = getInputElementValue();
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
					setInputElementValue(formatTime(newVal));
					autosize();
					repaintClock();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
					if (newVal != oldVal) {
						element.attr('value', newVal.replace(/^\+/, ''));
						settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
					}
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
				if ((new RegExp('^(-|\\+)?([0-9]+).([0-9]{2})$')).test(getInputElementValue())) {
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
					if (settings.afternoonHoursInOuterCircle) {
						h = h + (h >= 12 ? -12 : 12);
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
								var oldVal = getInputElementValue();
								if (newVal != oldVal) {
									if (settings.vibrate) navigator.vibrate(10);
									element.attr('value', newVal.replace(/^\+/, ''));
									settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
								}
								setInputElementValue(formatTime(newVal));
								autosize();
							}
						}
						isTimeChanged = true;
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
							var oldVal = getInputElementValue();
							if (newVal != oldVal) {
								if (settings.vibrate) navigator.vibrate(10);
								element.attr('value', newVal.replace(/^\+/, ''));
								settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
							}
							setInputElementValue(formatTime(newVal));
						}
						isTimeChanged = true;
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
				if (!getInputElementValue().match(/^-/)) {
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
				(new RegExp('^(-|\\+)?([0-9]+).([0-9]{1,2})$')).test(getInputElementValue());
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
				if (!getInputElementValue()) hour = -1;

				//Paint clock circle
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.clockFaceColor;
				ctx.fill();

				//Paint hover (if available)
				if (!isMobile() && hoverHour) {
					var isMinMaxFullfilled = true;
					if (settings.maximum && !isTimeSmallerOrEquals((negative ? '-' : '') + (hoverHour == 24 ? '00' : hoverHour) + ':00', settings.maximum)) isMinMaxFullfilled = false;
					if (settings.minimum && !isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + (hoverHour == 24 ? '00' : hoverHour) + ':00', true)) isMinMaxFullfilled = false;
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
				for(let i = 1; i <= 12; i++) {
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
					if ((!settings.maximum || isTimeSmallerOrEquals((negative ? '-' : '') + s + ':00', settings.maximum)) &&
						(!settings.minimum || isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + s + ':00', true))) {
						ctx.fillText(s,
							clockCenterX + Math.cos(angle) * clockOuterRadius - (ctx.measureText(s).width / 2),
							clockCenterY + Math.sin(angle) * clockOuterRadius + (settings.fonts.clockOuterCircleFontSize / 3));
					}
					else if (!settings.hideUnselectableNumbers) {
						ctx.fillStyle = settings.colors.clockOuterCircleUnselectableTextColor;
						ctx.fillText(s,
							clockCenterX + Math.cos(angle) * clockOuterRadius - (ctx.measureText(s).width / 2),
							clockCenterY + Math.sin(angle) * clockOuterRadius + (settings.fonts.clockOuterCircleFontSize / 3));
					}
				}

				//Paint hour numbers in inner circle
				ctx.font = settings.fonts.clockInnerCircleFontSize + 'px ' + settings.fonts.fontFamily;
				for(let i = 1; i <= 12; i++) {
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
					if ((!settings.maximum || isTimeSmallerOrEquals((negative ? '-' : '') + s + ':00', settings.maximum)) &&
						(!settings.minimum || isTimeSmallerOrEquals(settings.minimum, (negative ? '-' : '') + s + ':00', true))) {
						ctx.fillText(s,
							clockCenterX + Math.cos(angle) * clockInnerRadius - (ctx.measureText(s).width / 2),
							clockCenterY + Math.sin(angle) * clockInnerRadius + (settings.fonts.clockInnerCircleFontSize / 3));
					}
					else if (!settings.hideUnselectableNumbers) {
						ctx.fillStyle = settings.colors.clockInnerCircleUnselectableTextColor;
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
				(new RegExp('^(-|\\+)?([0-9]+).([0-9]{1,2})$')).test(getInputElementValue());
				var negative = RegExp.$1 == '-' ? true : false;
				var hour = parseInt(RegExp.$2);
				var min = parseInt(RegExp.$3);
				if (!getInputElementValue()) min = -1;

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
				for(let i = 1; i <= 12; i++) {
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
					else if (!settings.hideUnselectableNumbers) {
						ctx.fillStyle = settings.colors.clockOuterCircleUnselectableTextColor;
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
			  ADJUST POPUP DIMENSION AND POSITION (FOR MOBILE PHONES)
			 ************************************************************************************************/
			function adjustMobilePopupDimensionAndPosition() {

				var popupHeight;

				//Landscape mode
				if (window.innerHeight < 400) {
					popupWidth = window.innerHeight - 60;
					popup.css('width', popupWidth + 200 + 'px');
					inputElement.css('position', 'absolute')
								.css('left', '0px')
								.css('top', '0px')
								.css('width', '200px')
								.css('height', popupWidth + 20 + 'px');
					canvasHolder.css('margin', '10px 25px 0px 230px');
					popupHeight = popupWidth + parseInt(canvasHolder.css('margin-top')) + parseInt(canvasHolder.css('margin-bottom'));
				}
				//Normal mode (enough space for normal popup)
				else {
					popupWidth = window.innerWidth - 80;
					if (popupWidth > 300) popupWidth = 300;
					popup.css('width', popupWidth + 'px');
					inputElement.css('position', 'static')
								.css('width', '100%')
								.css('height', 'auto');
					canvasHolder.css('margin', '10px 25px 10px 25px');
					popupHeight = popupWidth + parseInt(canvasHolder.css('margin-top')) + parseInt(canvasHolder.css('margin-bottom')) + 65;
				}

				//Align popup in the middle of the screen
				popup.css('left', parseInt(($('body').prop('clientWidth') - popup.outerWidth()) / 2) + 'px');
				popup.css('top', parseInt((window.innerHeight - popupHeight) / 2) + 'px');

				canvasSize = popupWidth - 50;
				clockRadius = parseInt(canvasSize / 2);
				clockCenterX = parseInt(canvasSize / 2);
				clockCenterY = parseInt(canvasSize / 2);
				clockOuterRadius = clockRadius - 16;
				clockInnerRadius = clockOuterRadius - 29;
				canvasHolder.css('width', canvasSize + 'px');
				canvasHolder.css('height', canvasSize + 'px');
				
				var dpr = window.devicePixelRatio || 1;
				var hourCanvas = clockHourCanvas.get(0);
				var minuteCanvas = clockMinuteCanvas.get(0);
				hourCanvas.width = canvasSize * dpr;
				hourCanvas.height = canvasSize * dpr;
				minuteCanvas.width = canvasSize * dpr;
				minuteCanvas.height = canvasSize * dpr;
				var hourCtx = hourCanvas.getContext('2d');
				var minuteCtx = minuteCanvas.getContext('2d');
				hourCtx.scale(dpr, dpr);
				minuteCtx.scale(dpr, dpr);

				clockHourCanvas.css('width', canvasSize);
				clockHourCanvas.css('height', canvasSize);
				clockMinuteCanvas.css('width', canvasSize);
				clockMinuteCanvas.css('height', canvasSize);
			}


			/************************************************************************************************
			  SHOWS THE TIME PICKER
			 ************************************************************************************************/
			function showTimePicker() {
				if (!element.val()) setInputElementValue(formatTime('00:00'));
				else setInputElementValue(formatTime(element.val()));
				if (!isMobile() && settings.onlyShowClockOnMobile) popup.css('visibility', 'hidden');
				if (isMobile()) adjustMobilePopupDimensionAndPosition();
				popup.css('display', 'block');
				repaintClock();
				if (isMobile()) {
					if (background) background.stop().css('opacity', 0).css('display', 'block').animate({opacity: 1}, 300);
				} else {
					positionPopup();
					$(window).on('scroll.clockTimePicker', _ => {
						positionPopup();
					});
				}
				settings.onOpen.call(element.get(0));
			}
			
			function positionPopup() {
				var top = element.offset().top - $(window).scrollTop() + element.outerHeight();
				if (top + popup.outerHeight() > window.innerHeight) {
					var newTop = element.offset().top - $(window).scrollTop() - popup.outerHeight();
					if (newTop >= 0) top = newTop;
				}
				var left = element.offset().left - $(window).scrollLeft() - parseInt((popup.outerWidth() - element.outerWidth()) / 2);
				popup.css('left', left + 'px').css('top', top + 'px');
			}



			/************************************************************************************************
			  HIDES THE TIME PICKER
			 ************************************************************************************************/
			function hideTimePicker() {
				$(window).off('scroll.clockTimePicker');
				var newValue = formatTime(element.val());
				enteredDigits = '';
				popup.css('display', 'none');
				if (isMobile()) {
					background.stop().animate({opacity: 0}, 300, function() { background.css('display', 'none'); });
				} else {
					element.val(newValue);
				}
				blurAll();
				if (!isTimeChanged && !oldValue && newValue.match(new RegExp('^0+' + settings.separator + '00$'))) {
					setInputElementValue('');
				}
				else if (oldValue != newValue) {
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
					settings.onChange.call(element.get(0), newValue.replace(/^\+/, ''), oldValue.replace(/^\+/, ''));
					oldValue = newValue;
				}
				settings.onClose.call(element.get(0));
				isTimeChanged = false;
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
				settings.onModeSwitch.call(element.get(0), selectionMode);
			}



			/************************************************************************************************
			  SWITCH FROM HOUR SELECTION MODE TO MINUTE SELECTION MODE
			 ************************************************************************************************/
			function switchToMinuteMode(surpressAnimation) {
				if (selectionMode == 'MINUTE') return;
				enteredDigits = '';
				repaintClockMinuteCanvas();
				clockMinuteCanvas.stop().css('display', 'block')
										.css('zoom', '80%')
										.css('left', '10%')
										.css('top', '10%')
										.css('opacity', 0)
										.css('zIndex', 1);
				if (surpressAnimation) {
					clockMinuteCanvas.css('opacity', 1)
									 .css('zoom', '100%')
									 .css('left', '0px')
									 .css('top', '0px');
				}
				else {
					clockMinuteCanvas.animate({opacity: 1, zoom:'100%', left:'0px', top:'0px'});
				}
				selectionMode = 'MINUTE';
				settings.onModeSwitch.call(element.get(0), selectionMode);
			}



			/************************************************************************************************
			  SELECT HOUR ON INPUT ELEMENT
			 ************************************************************************************************/
			function selectHourOnInputElement() {
				inputElement.focus();
				setTimeout(function() {
					if (isMobile()) {
						$('.clock-timepicker-mobile-time-hours').css('backgroundColor', 'rgba(255, 255, 255, 0.6)');
						$('.clock-timepicker-mobile-time-minutes').css('backgroundColor', 'inherit');
					} else {
						inputElement.get(0).setSelectionRange(0, getInputElementValue().indexOf(settings.separator));
					}
				}, 1);
			}



			/************************************************************************************************
			  SELECT MINUTE ON INPUT ELEMENT
			 ************************************************************************************************/
			function selectMinuteOnInputElement() {
				inputElement.focus();
				setTimeout(function() {
					if (isMobile()) {
						$('.clock-timepicker-mobile-time-hours').css('backgroundColor', 'inherit');
						$('.clock-timepicker-mobile-time-minutes').css('backgroundColor', 'rgba(255, 255, 255, 0.6)');
					} else {
						inputElement.get(0).setSelectionRange(getInputElementValue().indexOf(settings.separator) + 1, getInputElementValue().length);
					}
				}, 1);
			}



			/************************************************************************************************
			  AUTOSIZE INPUT ELEMENT
			 ************************************************************************************************/
			function autosize() {
				if (!settings.autosize || isMobile()) return;
				tempAutosizeElement.html(element.val());
				tempAutosizeElement.css('display', 'inline-block');
				element.css('width', tempAutosizeElement.outerWidth() + 5 + parseInt(element.css('padding-left')) + parseInt(element.css('padding-right')) + 'px');
				tempAutosizeElement.css('display', 'none');
			}



			/************************************************************************************************
			  FORMATS THE TIME
			 ************************************************************************************************/
			function formatTime(time) {
				if (time == '') {
					if (settings.required) return settings.duration ? '0:00' : '00:00';
					else return time;
				}
				if ((new RegExp('^(-|\\+)?([0-9]+)(.([0-9]{1,2})?)?$', 'i')).test(time)) {
					var hour = parseInt(RegExp.$2);
					var min = parseInt(RegExp.$4);
					if (!min) min = 0;
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					if (hour >= 24 && !settings.duration) hour = hour % 24;
					if (min >= 60) min = min % 60;
					if (settings.precision != 1) {
						var f = Math.floor(min / settings.precision);
						min = f * settings.precision + (Math.round((min - f * settings.precision) / settings.precision) == 1 ? settings.precision : 0);
						if (min == 60) {
							min = 0;
							hour++;
							if (hour == 24 && !settings.duration) hour = 0;
						}
					}
					time = (negative ? '-' : '') + (hour < 10 && !settings.duration ? '0' : '') + hour + settings.separator + (RegExp.$3 ? (min < 10 ? '0' : '') + min : '00');
				}
				else if ((new RegExp('^(-|\\+)?.([0-9]{1,2})')).test(time)) {
					var min = parseInt(RegExp.$2);
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					if (min >= 60) min = min % 60;
					time = (negative && min > 0 ? '-' : '') + '0' + (!settings.duration ? '0' : '') + settings.separator + (min < 10 ? '0' : '') + min;
				}
				else {
					time = '0' + (!settings.duration ? '0' : '') + settings.separator + '00';
				}
				return (settings.duration && settings.useDurationPlusSign && !time.match(/^\-/) && !time.match(/^0+:00$/) ? '+' : '') + time;
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
				if (isMobile()) {
					showTimePicker();
					switchToHourMode(true);
					selectHourOnInputElement();
				} else {
					setTimeout(function() {
						if (popup.css('display') == 'none') onInputElementMouseDown(event);
					}, 50);
				}
			}


			function onInputElementDragSelectContextMenu(event) {
				if (!settings.contextmenu || event.which == 1) {
					event.stopImmediatePropagation();
					event.preventDefault();
					return false;
				}
			}


			function onInputElementMouseDown(event) {
				if (!settings.contextmenu || event.which == 1) {
					processClick(event);
					event.stopImmediatePropagation();
					event.stopPropagation();
					event.preventDefault();
					return false;
				}
			}


			function onInputElementKeyDown(event) {
				//TABULATOR
				if (event.keyCode == 9) {
					hideTimePicker();
				}
				//ENTER
				else if (event.keyCode == 13) {
					hideTimePicker();
				}
				//ESC
				else if (event.keyCode == 27) {
					setInputElementValue(formatTime(oldValue));
					hideTimePicker();
				}
				//BACKSPACE OR DELETE
				else if (event.keyCode == 8 || event.keyCode == 46) {
					enteredDigits = '';
					if (!getInputElementValue()) return false;
					var oldVal = getInputElementValue();
					var newVal;
					event.preventDefault();
					(new RegExp('^(-|\\+)?([0-9]+)(.([0-9]{1,2}))?$')).test(getInputElementValue());
					var negative = settings.duration && settings.durationNegative && RegExp.$1 == '-' ? true : false;
					var h = parseInt(RegExp.$2);
					var m = RegExp.$4 ? parseInt(RegExp.$4) : 0;
					if (selectionMode == 'HOUR') {
						if (h == 0) {
							newVal = settings.required ? (!settings.duration ? '0' : '') +'0' + settings.separator + '00' : '';
						} else {
							newVal = (!settings.duration ? '0' : '') + '0' + settings.separator + (m < 10 ? '0' : '') + m;
						}
						setInputElementValue(formatTime(newVal));
						if (!newVal) {
							hideTimePicker();
						} else {
							selectHourOnInputElement();
						}
						if (oldVal != newVal) {
							element.attr('value', newVal.replace(/^\+/, ''));
							settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
						}
					} else {
						if (m == 0) {
							if (h == 0 && !settings.required) {
								setInputElementValue('');
								if (oldVal != '') {
									element.attr('value', '');
									settings.onAdjust.call(element.get(0), '', oldVal.replace(/^\+/, ''));
								}
								hideTimePicker();
							} else {
								switchToHourMode();
								selectHourOnInputElement();
							}
						} else {
							newVal = (negative ? '-' : '') + (h < 10 && !settings.duration ? '0' : '') + h + settings.separator + '00';
							setInputElementValue(formatTime(newVal));
							selectMinuteOnInputElement();
							if (oldVal != newVal) {
								element.attr('value', newVal.replace(/^\+/, ''));
								settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
							}
						}
					}
					autosize();
				}
				//ARROW LEFT OR HOME
				else if ((event.keyCode == 36 || event.keyCode == 37) && getInputElementValue() != '') {
					setInputElementValue(formatTime(getInputElementValue()));
					if (selectionMode != 'HOUR') {
						selectHourOnInputElement();
						switchToHourMode();
					} else {
						event.preventDefault();
						event.stopPropagation();
					}
				}
				//ARROW RIGHT OR END
				else if ((event.keyCode == 35 || event.keyCode == 39) && getInputElementValue() != '') {
					setInputElementValue(formatTime(getInputElementValue()));
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
					if (getInputElementValue().length == 0) setInputElementValue('0');
					setInputElementValue(formatTime(getInputElementValue()));
					if (settings.precision != 60) {
						selectMinuteOnInputElement();
						if (selectionMode != 'MINUTE') switchToMinuteMode();
					} else {
						selectHourOnInputElement();
					}
				}
				//"+" SIGN
				else if (event.key == '+' && settings.duration && settings.durationNegative) {
					event.preventDefault();
					var oldVal = getInputElementValue();
					if (oldVal[0] == '-') {
						var newVal = oldVal.substring(1);
						setInputElementValue(formatTime(newVal));
						element.attr('value', newVal);
						settings.onAdjust.call(element.get(0), newVal, oldVal);
						autosize();
						repaintClock();
						if (selectionMode == 'HOUR') selectHourOnInputElement();
						else selectMinuteOnInputElement();
					}
				}
				//"-" SIGN
				else if (event.key == '-' && settings.duration && settings.durationNegative) {
					event.preventDefault();
					var oldVal = getInputElementValue().replace(/^\+/, '');
					if (oldVal[0] != '-') {
						var newVal = '-' + oldVal;
						setInputElementValue(formatTime(newVal));
						element.attr('value', newVal);
						settings.onAdjust.call(element.get(0), newVal, oldVal);
						autosize();
						repaintClock();
						if (selectionMode == 'HOUR') selectHourOnInputElement();
						else selectMinuteOnInputElement();
					}
				}
				//ARROW UP OR "+" SIGN, ARROW DOWN OR "-" SIGN
				else if (event.keyCode == 38 || event.key == '+' || event.keyCode == 40 || event.key == '-') {
					event.preventDefault();
					var oldVal = getInputElementValue();
					(new RegExp('^(-|\\+)?([0-9]+)(.([0-9]{1,2}))?$')).test(oldVal);
					var h = parseInt(RegExp.$2);
					if (settings.duration && settings.durationNegative && RegExp.$1 == '-') h = -h;
					var m = RegExp.$4 ? parseInt(RegExp.$4) : 0;
					if (selectionMode == 'HOUR') h += event.keyCode == 38 || event.key == '+' ? 1 : -1;
					else {
						m += (event.keyCode == 38 || event.key == '+' ? 1 : -1) * settings.precision;
						if (m < 0) m = 0;
						else if (m > 59) m = 60 - settings.precision;
					}
					var min = settings.minimum;
					if ((!settings.duration || !settings.durationNegative) && min[0] == '-') min = '0:00';
					var max = settings.maximum;
					if (settings.precision != 1) {
						var minPart = parseInt(max.replace(/^(\+|-)?[0-9]+./, ''));
						max = max.replace(/.[0-9]+$/, '') + settings.separator + (minPart - (minPart % settings.precision));
					}
					var newVal = (h < 0 ? '-' : '') + (h < 10 && !settings.duration ? '0': '') + Math.abs(h) + settings.separator + (m < 10 ? '0' : '') + m;
					if (selectionMode == 'HOUR') {
						if (!isTimeSmallerOrEquals(newVal, max)) newVal = max;
						else if (!isTimeSmallerOrEquals(min, newVal)) newVal = min;
					}
					if (oldVal != newVal) {
						setInputElementValue(formatTime(newVal));
						element.attr('value', newVal.replace(/^\+/, ''));
						settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
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
				if (event.shiftKey || event.ctrlKey || event.altKey || !event.key.match(/^[0-9]{1}$/)) return;
				var hourPart = getInputElementValue().replace(/.[0-9]+$/, '');
				var minPart = getInputElementValue().replace(/^(\+|-)?[0-9]+./, '');
				var isNegative = getInputElementValue()[0] == '-';
				var oldVal = getInputElementValue();
				enteredDigits += event.key;
				var newVal = (selectionMode == 'HOUR' ? (isNegative ? '-' : '') + (!settings.duration && enteredDigits.length == 1 ? '0' : '') + enteredDigits : hourPart) + settings.separator + (selectionMode == 'HOUR' ? minPart : (enteredDigits.length == 1 ? '0' : '') + enteredDigits);
				if (isTimeSmallerOrEquals(newVal, settings.minimum)) newVal = settings.minimum;
				if (isTimeSmallerOrEquals(settings.maximum, newVal)) newVal = settings.maximum;
				newVal = formatTime(newVal);
				setInputElementValue(newVal);
				isTimeChanged = true;
				var nextPossibleVal = (selectionMode == 'HOUR' ? (isNegative ? '-' : '') + (enteredDigits + '0') : hourPart) + settings.separator + (selectionMode == 'HOUR' ? '00' : (enteredDigits + '0'));
				if ((selectionMode == 'MINUTE' && (enteredDigits.length == 2 || parseInt(enteredDigits + '0') >= 60)) || (selectionMode == 'HOUR' && !settings.duration && enteredDigits.length == 2) || (isNegative ? !isTimeSmallerOrEquals(settings.minimum, nextPossibleVal) : !isTimeSmallerOrEquals(nextPossibleVal, settings.maximum))) {
					enteredDigits = '';
					if (selectionMode == 'HOUR') {
						if (settings.precision == 60 || (newVal == settings.maximum && settings.maximum.match(/00$/)) || (settings.minimum[0] == '-' && newVal == settings.minimum && settings.minimum.match(/00$/))) {
							hideTimePicker();
							return;
						}
						else {
							switchToMinuteMode();
							selectMinuteOnInputElement();
							return;
						}
					} else {
						hideTimePicker();
						return;
					}
				}
				if (selectionMode == 'HOUR') selectHourOnInputElement();
				else selectMinuteOnInputElement();
				if (newVal != oldVal) {
					element.attr('value', newVal.replace(/^\+/, ''));
					settings.onAdjust.call(element.get(0), newVal.replace(/^\+/, ''), oldVal.replace(/^\+/, ''));
				}
				autosize();
				repaintClock();
			}


			function getInputElementValue() {
				if (isMobile()) {
					return $('.clock-timepicker-mobile-time-hours').html() + settings.separator + $('.clock-timepicker-mobile-time-minutes').html();
				}
				else {
					return inputElement.val();
				}
			}


			function setInputElementValue(value) {
				if (isMobile()) {
					if (value.match(/^(-|\\+)?([0-9]{1,2}).([0-9]{1,2})$/)) {
						var hours = RegExp.$1 + (!settings.duration && RegExp.$2.length == 1 ? '0' : '') + RegExp.$2;
						var minutes = (RegExp.$3.length == 1 ? '0' : '') + RegExp.$3;
						$('.clock-timepicker-mobile-time-hours').html(hours);
						$('.clock-timepicker-mobile-time-minutes').html(minutes);
					}
				}
				else {
					inputElement.val(value);
				}
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
		function isTimeSmallerOrEquals(time1, time2, doNotInvolveMinutePart) {
			var regex = '^(-|\\+)?([0-9]+)(.([0-9]{1,2}))?$';
			(new RegExp(regex, 'i')).test(time1);
			var t1 = parseInt(RegExp.$2) * 60;
			if (RegExp.$4 && !doNotInvolveMinutePart) t1 += parseInt(RegExp.$4);
			if (RegExp.$1 == '-') t1 *= -1;
			(new RegExp(regex, 'i')).test(time2);
			var t2 = parseInt(RegExp.$2) * 60;
			if (RegExp.$4 && !doNotInvolveMinutePart) t2 += parseInt(RegExp.$4);
			if (RegExp.$1 == '-') t2 *= -1;
			if (t1 <= t2) return true;
			else return false;
		}

		function validateSettings() {
			settings.precision = parseInt(settings.precision);
			settings.modeSwitchSpeed = parseInt(settings.modeSwitchSpeed);
			settings.popupWidthOnDesktop = parseInt(settings.popupWidthOnDesktop);
			settings.fonts.clockOuterCircleFontSize = parseInt(settings.fonts.clockOuterCircleFontSize);
			settings.fonts.clockInnerCircleFontSize = parseInt(settings.fonts.clockInnerCircleFontSize);
			settings.fonts.buttonFontSize = parseInt(settings.fonts.buttonFontSize);

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
		}
	};
}(jQuery));
