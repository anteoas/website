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

	// Function to display additional product content
	$(".content_more_btn").click(function(e){
		e.preventDefault();

		var elem = $(this);
		var block = $(this).next('.content_more');

		if(block.is(":visible")) {
			$(".fa", this).removeClass('fa-chevron-down').addClass('fa-chevron-right');
			block.slideUp(500);
		} else {
			$(".fa", this).removeClass('fa-chevron-right').addClass('fa-chevron-down');
			block.slideDown(500);
		}
	});

});