jQuery(document).ready(function($){

	// Responsive header resizing using fittext.js
	$(".title").fitText(1, { minFontSize: '42px', maxFontSize: '82px' });


	// Nav btn functions to scroll to section
	$(".nav-btn").click(function(e) {
		e.preventDefault();

		var elem = $(this).attr('href');

		if($(elem).length) {
			$('html, body').animate( { scrollTop: $(elem).offset().top }, 800 );
		} else {
			return false;
		}
	});

});