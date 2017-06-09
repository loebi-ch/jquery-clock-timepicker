/* 
 * Author:  Andreas Loeber
 * Plugin:  jquery-clock-timerpicker
 * Version: 1.0.5
 */
 (function($) {
	
	$.fn.clockTimePicker = function(options) {
				
		/************************************************************************************************
		  DEFAULT SETTINGS (CAN BE OVERRIDDEN WITH THE OPTIONS ARGUMENT)
		 ************************************************************************************************/
		var settings = $.extend({
			afternoonHoursInOuterCircle: false,
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
				selectorNumberColor: '#FFFFFF'
			},
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
			modeSwitchSpeed: 500,
			onChange: function(newVal, oldVal) { /*console.log('Value changed from ' + oldVal + ' to ' + newVal + '.');*/ },
			onClose: function() {},
			onModeSwitch: function() {},
			onOpen: function() {},
			popupWidthOnDesktop: 200,
			vibrate: true
		}, options);
		
		
		/************************************************************************************************
		  DYNAMICALLY INSERT CSS CODE FOR SELECTION ON MOBILE
		 ************************************************************************************************/
		if (isMobile()) {
			var css = '.clock-timepicker input::selection { background:rgba(255,255,255,0.6); }' +
					  '.clock-timepicker input::-moz-selection { background:rgba(255,255,255,0.6); }';
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
			
			/************************************************************************************************
			  INITIALIZE VARIABLES
			 ************************************************************************************************/
			var element = $(this);
			element.val(formatTime(element.val()));
			var oldValue = element.val();
			var changeHandler = element[0].onchange;
			element[0].onchange = '';
			var selectionMode = 'HOUR'; //2 modes: 'HOUR' or 'MINUTE'
			var isDragging = false;
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
			  INITIALIZE THE DIV TO DARKEN THE WEBSITE WHILE CHOOSING A TIME
			 ************************************************************************************************/
			var darkenScreen;
			if (isMobile()) {
				darkenScreen = $('<div>');
				darkenScreen.css('zIndex', 99998)
							.css('display', 'none')
							.css('position', 'fixed')
							.css('top', '0px')
							.css('left', '0px')
							.css('width', '100%')
							.css('height', '100%')
							.css('backgroundColor', 'rgba(0,0,0,0.6)');
				darkenScreen.on('touchmove', function(event) {
					event.preventDefault();
				});
				darkenScreen.on('click', function(event) {
					event.preventDefault();
					event.stopImmediatePropagation();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
					return false;
				});
				$('body').append(darkenScreen);
			}
			
			
			
			/************************************************************************************************
			  INITIALIZE POPUP
			 ************************************************************************************************/
			var popup = $('<div>');
			popup.css('display', 'none')
				 .css('zIndex', 99999)
				 .css('cursor', 'default')
				 .css('position', 'absolute')
				 .css('width', popupWidth + 'px')
				 .css('backgroundColor', settings.colors.popupBackgroundColor)
				 .css('box-shadow', '0 4px 20px 0px rgba(0, 0, 0, 0.14)')
				 .css('border-radius', '5px');
			if (isMobile()) {
				popup.css('position', 'fixed')
					 .css('left', '40px')
					 .css('top', '40px');
			}
			if (isMobile()) {
				popup.on('touchmove', function(event) {
					event.preventDefault();					
				});
				popup.on('click', function(event) {
					event.stopImmediatePropagation();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
					return false;
				});
			}
			element.parent().append(popup);
			
			
			
			/************************************************************************************************
			  DESKTOP VERSION: A CLICK OUTSIDE OF THE POPUP SHOULD CLOSE THE TIME PICKER
			 ************************************************************************************************/
			$(window).on('click', function(event) {
				if (!isMobile() && popup.css('display') != 'none' && !($(event.target)[0] == inputElement[0] || $.contains(inputElement.parent()[0], $(event.target)[0]))) {
					hideTimePicker();
				}
			});
			
			
			
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
			inputElement.on('dragenter', function(event) { event.stopImmediatePropagation(); event.preventDefault(); return false; });
			inputElement.on('dragover', function(event) { event.stopImmediatePropagation(); event.preventDefault(); return false; });
			inputElement.on('drop', function(event) { event.stopImmediatePropagation(); event.preventDefault(); return false; });
			inputElement.on('keyup', function(event) {
				var newValue = formatTime(inputElement.val());
				if ((event.keyCode >= 48 && event.keyCode <= 57) &&
				    (inputElement[0].selectionStart == 2 ||
					(new RegExp('^[0-9]{2}:$').test(inputElement.val())) ||
					inputElement.val().length == 5)) {
					inputElement.val(newValue);
					switchToMinuteMode();
					selectMinuteOnInputElement();
				}
				else if ((event.keyCode == 8 || event.keyCode == 46) && inputElement.val() && inputElement.val()[inputElement.val().length-1] == ':') {
					newValue = formatTime(inputElement.val() + '00');
					inputElement.val(newValue);
					selectMinuteOnInputElement();
				}
				else if ((event.keyCode == 8 || event.keyCode == 46) && inputElement.val() && inputElement.val()[0] == ':') {
					newValue = formatTime('00' + inputElement.val());
					inputElement.val(newValue);
					selectHourOnInputElement();
				}
				if (oldValue != newValue) {
					repaintClock();
					settings.onChange(newValue, oldValue);
					if (changeHandler) changeHandler(event);
				}
			});
			inputElement.on('keydown', function(event) {
				oldValue = formatTime(inputElement.val());
				if (event.keyCode >= 48 && event.keyCode <= 57) { //NUMBERS
					if (inputElement.val().length == 5 && inputElement[0].selectionStart == 5 && event.keyCode != 8) {
						event.preventDefault();
						return false;
					}
				}
				else if (event.keyCode == 9) {} //TABULATOR
				else if (event.keyCode == 13) { //ENTER
					hideTimePicker();
					inputElement.trigger('blur');
				}
				else if (event.keyCode == 27) { //ESC
					hideTimePicker();
					inputElement.trigger('blur');
				}
				else if (event.keyCode == 8 || event.keyCode == 46) { //BACKSPACE OR DELETE
					if (inputElement[0].selectionStart == 0 && inputElement[0].selectionEnd == 2) {
						event.preventDefault();
						if (inputElement.val().substring(0, 2) == '00') {
							inputElement.val('');
							switchToHourMode();
						} else {
							inputElement.val('00:' + inputElement.val().substring(3));
							selectHourOnInputElement();
						}
					} else if (inputElement[0].selectionStart == 3 && inputElement[0].selectionEnd == 5) {
						event.preventDefault();
						if (inputElement.val().substring(3) == '00') {
							if (inputElement.val() == '00:00') inputElement.val('');
							switchToHourMode();
							selectHourOnInputElement();
						} else {
							inputElement.val(inputElement.val().substring(0, 2) + ':00');
							selectMinuteOnInputElement();
						}
					}
				}
				else if ((event.keyCode == 36 || event.keyCode == 37) && inputElement.val() != '') { //ARROW LEFT OR HOME
					inputElement.val(formatTime(inputElement.val()));
					selectHourOnInputElement();
					switchToHourMode();
				}
				else if ((event.keyCode == 35 || event.keyCode == 39) && inputElement.val() != '') { //ARROW RIGHT OR END
					inputElement.val(formatTime(inputElement.val()));
					selectMinuteOnInputElement();
					switchToMinuteMode();
				}
				else if (event.keyCode == 190) { //COLON OR DOT
					event.preventDefault();
					if (inputElement.val().length == 0) inputElement.val('0');
					inputElement.val(formatTime(inputElement.val()));
					selectMinuteOnInputElement();
					switchToMinuteMode();
				}
				else if (event.keyCode == 38 || event.keyCode == 40) { //ARROW UP OR DOWN
					event.preventDefault();
					if (oldValue == '') return;
					(new RegExp('^([0-9]{1,2})(:([0-9]{1,2}))?$')).test(inputElement.val());
					var h = parseInt(RegExp.$1);
					var m = RegExp.$3 ? parseInt(RegExp.$3) : 0;
					if (selectionMode == 'HOUR') {
						if (event.keyCode == 38) h -= 1;
						else h += 1;
						if (h == -1) h = 23;
						if (h == 24) h = 0;
					} else {
						if (event.keyCode == 38) m -= 1;
						else m += 1;
						if (m == -1) m = 59;
						if (m == 60) m = 0;
					}
					inputElement.val((h < 10 ? '0': '') + h + ':' + (m < 10 ? '0' : '') + m);
					repaintClock();
					if (selectionMode == 'HOUR') selectHourOnInputElement();
					else selectMinuteOnInputElement();
				}
				else {
					event.preventDefault();
				}
			});
			element.on('mousewheel', function(event) {
				processMouseWheelEvent(event);
			});
			element.on('blur', function(event) {
				setTimeout(function() {
					if ($(document.activeElement)[0] != $('body')[0] && !$.contains(element.parent()[0], $(document.activeElement)[0])) {
						hideTimePicker();
					}
				}, 1);
			});
			element.on('focus', function(event) {
				if (popup.css('display') == 'none') {
					hasJustGotFocus = true;
					setTimeout(function() {
						hasJustGotFocus = false;
					}, 500);
					showTimePicker();
					selectHourOnInputElement();
				}
			});
			element.on('change', function(event) {
				if (popup.css('display') == 'none') return;
				repaintClock();
				if (selectionMode == 'HOUR') selectHourOnInputElement();
				else selectMinuteOnInputElement();
			});
			inputElement.on('click', function(event) {
				processClick(event);
			});
			inputElement.on('contextmenu', function(event) {
				event.stopImmediatePropagation();
				event.preventDefault();
				processClick(event);
				return false;
			});
			
			
						
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
				buttonArea.html('<div id="log"></div>');
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
						if (!processTimeSelection(x, y, true)) return false;
						if (selectionMode == 'MINUTE') {
							hideTimePicker();
						} else {
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
						processTimeSelection(x, y);
						isDragging = true;
					});
					canvas.on('touchend', function(event) {
						event.preventDefault();
						isDragging = false;
						switchToMinuteMode();
						selectMinuteOnInputElement();
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
				if (hasJustGotFocus) return;
				if (inputElement[0].selectionStart >= 3) {
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
				if (!((inputElement[0].selectionStart == 0 && inputElement[0].selectionEnd == 2) ||
				      (inputElement[0].selectionStart == 3 && inputElement[0].selectionEnd == 5))) return;
				var e = window.event || event; // old IE support
				var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
				(new RegExp('^([0-9]{1,2})(:([0-9]{1,2}))?$')).test(inputElement.val());
				var h = parseInt(RegExp.$1);
				var m = RegExp.$3 ? parseInt(RegExp.$3) : 0;
				if (selectionMode == 'HOUR') {
					h += delta;
					if (h == -1) h = 23;
					if (h == 24) h = 0;
				} else {
					m += delta;
					if (m == -1) m = 59;
					if (m == 60) m = 0;
				}
				inputElement.val((h < 10 ? '0': '') + h + ':' + (m < 10 ? '0' : '') + m);
				repaintClock();
				if (selectionMode == 'HOUR') selectHourOnInputElement();
				else selectMinuteOnInputElement();
			}
			
			
			
			/************************************************************************************************
			  CONVERTS A CLICK / TOUCH IN THE CANVAS TO A TIME AND SETS THE NEW VALUE
			 ************************************************************************************************/	
			function processTimeSelection(x, y, clicked) {
				var selectorAngle = (360 * Math.atan((y - clockCenterY)/(x - clockCenterX)) / (2 * Math.PI)) + 90;
				var selectorLength = Math.sqrt(Math.pow(Math.abs(x - clockCenterX), 2) + Math.pow(Math.abs(y - clockCenterY), 2));
				
				var hour = 0;
				var min = 0;
				if ((new RegExp('^([0-9]{2}):([0-9]{2})$')).test(inputElement.val())) {
					hour = parseInt(RegExp.$1);
					min = parseInt(RegExp.$2);
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
						var newVal = (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
						if (isDragging || clicked) {
							var oldVal = inputElement.val();
							if (newVal != oldVal && settings.vibrate) navigator.vibrate(10);
							inputElement.val(newVal);
							if (newVal != oldVal) {
								setTimeout(function() {
									settings.onChange(newVal, oldVal);
									if (changeHandler) changeHandler(event);
								}, 10);
							}
						}
						repaintClockHourCanvas(h == 0 ? 24 : h);
						return true;
					}
					else {
						repaintClockHourCanvas();
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
						var newVal = (hour < 10 ? '0' : '') + hour + ':' + (m < 10 ? '0' : '') + m;
						if (isDragging || clicked) {
							var oldVal = inputElement.val();
							if (newVal != oldVal && settings.vibrate) navigator.vibrate(10);
							inputElement.val(newVal);
							if (newVal != oldVal) {
								setTimeout(function() {
									settings.onChange(newVal, oldVal);
									if (changeHandler) changeHandler(event);
								}, 10);
							}
						}
						repaintClockMinuteCanvas(m == 0 ? 60 : m);
						return true;
					}
					else {
						repaintClockMinuteCanvas();
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
			  REPAINTS THE CLOCK HOUR CANVAS
			 ************************************************************************************************/
			function repaintClockHourCanvas(hoverHour) {
				
				var ctx = clockHourCanvas.get(0).getContext('2d');
				(new RegExp('^([0-9]{1,2}):([0-9]{1,2})$')).test(inputElement.val());
				var hour = parseInt(RegExp.$1);
				if (hour == 0) hour = 24;
				if (!inputElement.val()) hour = -1;
				
				//Paint clock circle			
				ctx.clearRect(0, 0, canvasSize, canvasSize);
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.clockFaceColor;
				ctx.fill();
				
				//Paint hover (if available)
				if (!isMobile() && hoverHour) {
					ctx.beginPath();
					ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((hoverHour % 12) - 3)) * (hoverHour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
							clockCenterY + Math.sin(Math.PI / 6 * ((hoverHour % 12) - 3)) * (hoverHour > 12 ? (settings.afternoonHoursInOuterCircle ? clockOuterRadius : clockInnerRadius) : (settings.afternoonHoursInOuterCircle ? clockInnerRadius : clockOuterRadius)),
							15, 0, 2 * Math.PI, false);
					ctx.fillStyle = settings.colors.hoverCircleColor;
					ctx.fill();
				}
				
				//Paint hour selector
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, 3, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.selectorColor;
				ctx.fill();
				if (hour > -1) {
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
					ctx.fillText(s,
								 clockCenterX + Math.cos(angle) * clockOuterRadius - (ctx.measureText(s).width / 2),
								 clockCenterY + Math.sin(angle) * clockOuterRadius + (settings.fonts.clockOuterCircleFontSize / 3));
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
					ctx.fillText(s,
								 clockCenterX + Math.cos(angle) * clockInnerRadius - (ctx.measureText(s).width / 2),
								 clockCenterY + Math.sin(angle) * clockInnerRadius + (settings.fonts.clockInnerCircleFontSize / 3));
				}
			}
			
			
			
			/************************************************************************************************
			  REPAINTS THE CLOCK MINUTE CANVAS
			 ************************************************************************************************/
			function repaintClockMinuteCanvas(hoverMinute) {
				
				var ctx = clockMinuteCanvas.get(0).getContext('2d');				
				(new RegExp('^([0-9]{1,2}):([0-9]{1,2})$')).test(inputElement.val());
				var min = parseInt(RegExp.$2);
				if (!inputElement.val()) min = -1;
				
				//Paint clock circle				
				ctx.clearRect(0, 0, canvasSize, canvasSize);
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, clockRadius, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.clockFaceColor;
				ctx.fill();
				
				//Paint hover (if available)
				if (!isMobile() && hoverMinute) {
					if (hoverMinute == 60) hoverMinute = 0;
					ctx.beginPath();
					ctx.arc(clockCenterX + Math.cos(Math.PI / 6 * ((hoverMinute / 5) - 3)) * clockOuterRadius,
							clockCenterY + Math.sin(Math.PI / 6 * ((hoverMinute / 5) - 3)) * clockOuterRadius,
							15, 0, 2 * Math.PI, false);
					ctx.fillStyle = settings.colors.hoverCircleColor;
					ctx.fill()
				}
				
				//Paint minute selector
				ctx.beginPath();
				ctx.arc(clockCenterX, clockCenterY, 3, 0, 2 * Math.PI, false);
				ctx.fillStyle = settings.colors.selectorColor;
				ctx.fill();
				if (min > -1) {
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
					var angle = Math.PI / 6 * (i - 3);
					if (min == i * 5 || (min == 0 && i == 12)) ctx.fillStyle = settings.colors.selectorNumberColor;
					else ctx.fillStyle = settings.colors.clockOuterCircleTextColor;
					var s = i * 5 == 5 ? '05' : i * 5;
					if (s == 60) s = '00';
					ctx.fillText(s,
								 clockCenterX + Math.cos(angle) * clockOuterRadius - (ctx.measureText(s).width / 2),
								 clockCenterY + Math.sin(angle) * clockOuterRadius + (settings.fonts.clockOuterCircleFontSize / 3));
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
			}
			
			
			
			/************************************************************************************************
			  SHOWS THE TIME PICKER
			 ************************************************************************************************/	
			function showTimePicker() {
				inputElement.val(element.val());
				repaintClockHourCanvas();
				switchToHourMode(true);
				popup.css('display', 'block');
				if (isMobile()) {
					darkenScreen.stop().css('opacity', 0).css('display', 'block').animate({opacity: 1}, 300);
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
				popup.css('display', 'none');
				if (isMobile()) {
					darkenScreen.stop().animate({opacity: 0}, 300, function() { darkenScreen.css('display', 'none'); });
				} else {
					element.val(formatTime(element.val()));
				}
				settings.onClose();
			}
			
			
			
			/************************************************************************************************
			  SWITCH FROM MINUTE SELECTION MODE TO HOUR SELECTION MODE
			 ************************************************************************************************/
			function switchToHourMode(surpressAnimation) {
				if (selectionMode == 'HOUR') return;
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
					inputElement.get(0).setSelectionRange(0, 2);
				}, 1);
			}
			

			
			/************************************************************************************************
			  SELECT MINUTE ON INPUT ELEMENT
			 ************************************************************************************************/
			function selectMinuteOnInputElement() {
				inputElement.focus();
				setTimeout(function() {						
					inputElement.get(0).setSelectionRange(3, 5);
				}, 1);
			}
			
			
			
			/************************************************************************************************
			  FORMATS THE TIME
			 ************************************************************************************************/	
			function formatTime(time) {
				if (time == '') return time;
				if ((new RegExp('^([0-9]{1,2})(:([0-9]{1,2}))?')).test(time)) {
					var hour = parseInt(RegExp.$1);
					var min = parseInt(RegExp.$3);
					if (hour >= 24) hour = hour % 24;
					if (min >= 60) min = min % 60;
					time = (hour < 10 ? '0' : '') + hour + ':' + (RegExp.$3 ? (min < 10 ? '0' : '') + min : '00');
				}
				else if ((new RegExp('^:([0-9]{1,2})')).test(time)) {
					var min = parseInt(RegExp.$1);
					if (min >= 60) min = min % 60;
					time = '00:' + (min < 10 ? '0' : '') + min;
				}
				else {
					time = '00:00';
				}
				return time;
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
	};	
}(jQuery));
