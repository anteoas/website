jQuery(document).ready(function($){

	// Make intro section responsive
	resize_intro();
	$(window).resize(function(){
		resize_intro();
	});

	// Function to resize the intro section
	function resize_intro() {
		var window_height = $(window).height();
		var intro_height = window_height * 0.6;

		$("#intro").css('height', intro_height);
	}

	// Responsive header resizing using fittext.js
	$(".title").fitText(1, { minFontSize: '42px', maxFontSize: '82px' });

});