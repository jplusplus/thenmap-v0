<?php

/* HEADERS */
header("content-type: application/x-javascript; charset=utf-8");
header('Cache-Control: public');
$modify_time = filemtime(__FILE__);
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");

/* LIBRARIES */
/* Class for handling all settings */
require_once('lib/setting.php');
/* i18n for controls */
require_once('lib/light-i18n.php');
/* JShrink minifyer */
include_once('lib/Minifier.php');

/* SETTINGS */
/* Paths */
$staticUrl = '//static.thenmap.net';
$thenmapUrl = '//www.thenmap.net';

/* Languages*/
$languages = array( 'available'    => array ('sv','en','fi','fr','de','es','ru','it','nl','pl','zh','pt','ar','ja','fa','no','he','tr','da','uk','ca','id','hu','vi','ko','et','cs','hi','sr','bg'),
					//Languages with large Wikipedias. Other languages will require extensive local translations
					"fallback"     => 'sv',
					"type"         => Setting::LANGUAGE,
					);

/* Maps */
$maps = array(	"available"    => array ('europe-ortho',
										 'africa-laea',
										 'world-robinson',
										 'world-mollweide',
										 'europe-caucasus-lcc'
										),
				"aliases"      => array ('europe'    => 'europe-ortho',
										 'world'     => 'world-robinson',
 										 'robinson'  => 'world-robinson',
 										 'mollweide' => 'world-mollweide',
										 'africa'    => 'africa-laea',
										 'europe-caucasus' => 'europe-caucasus-lcc',
										),
				"fallback"     => 'world-robinson',
			);

/* Print controlbar (pause/play-button etc)? */
$printControlbar = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$printControlbar->set( filter_input(INPUT_GET,"controls",FILTER_SANITIZE_STRING) );

/* Debug mode? */
$debugMode = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "false" ) );
$debugMode->set( filter_input(INPUT_GET,"debug",FILTER_SANITIZE_STRING) || "localhost" === $_SERVER["HTTP_HOST"]);
if ( $debugMode->get() ) {
	$thenmapUrl = '/thenmap';
}

/* Interface language */
$interfaceLanguage = new Setting( $languages );
$interfaceLanguage->set( filter_input(INPUT_GET,"lang",FILTER_SANITIZE_STRING) );
$_SESSION['lang'] = $interfaceLanguage->get();

/* Map language */ 
$mapLanguage = new Setting( $languages );
/* If no map language given, but lang is explicitly set, use lang */
if ( $_GET["lang"] && !$_GET["mlang"] ) {
	$mapLanguage->set( $interfaceLanguage->get() );
} else {
	$mapLanguage->set( filter_input(INPUT_GET,"mlang",FILTER_SANITIZE_STRING) );
}
/* Map type */
$map = new Setting( $maps );
$map->set( filter_input(INPUT_GET,"map",FILTER_SANITIZE_STRING) );

$svgFile = $thenmapUrl . '/maps/' . $map->get() . '/' . $map->get() . '.svg';
$mapsVersion = filemtime($svgFile);
$cacheHash = md5($mapsVersion);

/* Dates */
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1949 ) );
$firstYear->set( filter_input(INPUT_GET,"fYear",FILTER_SANITIZE_STRING) );

$lastYear      = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 2013 ) );
$lastYear->set( filter_input(INPUT_GET,'lYear',FILTER_SANITIZE_STRING) );

$startingYear  = new Setting ( array ( 'type' => Setting::YEAR, "fallback" => 1965 ) );
$startingYear->set( filter_input(INPUT_GET,'sYear',FILTER_SANITIZE_STRING) );

$dateOffset    = new Setting ( array ( 'fallback' => '07-01') );
$dateOffset->set( filter_input(INPUT_GET,'offset',FILTER_SANITIZE_STRING) );

if ( $lastYear <= $firstYear ) {
	$lastYear = $firstYear+1;
}

if ( $startingYear < $firstYear ) {
	$startingYear = $firstYear;
}

if ($startingYear > $lastYear ) {
	$startingYear = $lastYear;
}

/* Data sets */
$dataCss = new Setting ( array ( "type" => Setting::STRING ) );
$dataCss->set( filter_input(INPUT_GET,"dataCss",FILTER_SANITIZE_STRING) );

/***********************************************************************************************/
/* Start buffer */
/***********************************************************************************************/

ob_start();

/***********************************************************************************************/
/***********************************************************************************************/
/***********************************************************************************************/

?>(function() {
	/* ADD CSS first of all. check first if already present? */
	/* TODO http://stackoverflow.com/questions/4724606/js-how-to-load-css-if-not-loaded */
	var url = "<?php echo $thenmapUrl; ?>/css/thenmap.css?c=<?php echo $cacheHash; ?>";
	if(document.createStyleSheet) {
		try { document.createStyleSheet(url); } catch (e) { }
	} else {
		var css = document.createElement('link');
		css.rel     = 'stylesheet';
		css.type    = 'text/css';
		css.href    = url;
		document.getElementsByTagName("head")[0].appendChild(css);
	}
	/* ADD DATA SET, IF ANY */
	<?php
	if ( $val = $dataCss->get() ) {
		$CssUrl = "\"css/$val.css\""
	 ?>
	var url = <?php echo ($CssUrl); ?>;
		if(document.createStyleSheet) {
		try { document.createStyleSheet(url); } catch (e) { }
	} else {
		var css = document.createElement('link');
		css.rel     = 'stylesheet';
		css.type    = 'text/css';
		css.href    = url;
		document.getElementsByTagName("head")[0].appendChild(css);
	}
	<?php } ?>

	/* JQUERY LOADER, TO ALLOW US TO LOAD JQUERY */
	/* ONLY IF NOT ALREADY LOADED */
	if (typeof jQuery === 'undefined') {
		// Load the script
	    var script = document.createElement("SCRIPT");
	    <?php
		    if ( $debugMode ) { ?>
	    script.src = 'js/jquery.min.js';
		<?php } else { ?>
	    script.src = '//ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js';
	    <?php } ?>
	    script.type = 'text/javascript';
	    document.getElementsByTagName("head")[0].appendChild(script);
	} else {
		console.log("JQuery already loaded with version "+jQuery.fn.jquery);
	}

	// Poll for jQuery to come into existance
	var checkReady = function(callback) {
		if (window.jQuery) {
			callback(jQuery);
		} else {
			window.setTimeout(function() { checkReady(callback); }, 30);
		}
	};
	
	/* includedragdealer */
	<?php
		echo (file_get_contents('js/dragdealer.js'));
	?>
	
	// Start...
	checkReady(function($) {

/** JQUERY LOADED**/
/*************/
/* GLOBALS   */
/*************/
var currentYear  = <?php echo $startingYear->get(); ?>;
var startingYear = <?php echo $startingYear->get(); ?>;
var firstYear    = <?php echo $firstYear->get(); ?>;
var lastYear     = <?php echo $lastYear->get(); ?>;

/***********************************************************************************************/


/* DOCUMENT READY */
$(document).ready(function(){

	/* DATA    */
	var nationTitles = <?php
		$file = 'maps/' . $map->get() . '/' . $map->get() . '-' . $mapLanguage->get() . '.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>;
	var nationFlags = <?php
		$file = 'maps/' . $map->get(). '/' . $map->get() . '-flags.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>;


	/* ELEMENTS */
	/* A div/section with id="thenmap" is the only required markup       */
	/* We will, however, only append elements that do not already exists */
	var $thenmap = $("#thenmap");
	var	$thenmapMapContainer,$thenmapsvg,$nations,$thenmapSlider,$timelineHandle,$thenmapControlbar;
	/* END ELEMENTS */
	/***********************************************************************************************/

	/* CREATE HTML MARKUP */	
	/* Create map container, if it do not already exist */
	$thenmapMapContainer = $thenmap.find('#thenmap-map-container');
	if ( !$thenmapMapContainer.length ) {
		$thenmapMapContainer =
		$('<div/>', {
			id:   'thenmap-map-container',
			class: 'loading'
		}).prependTo($thenmap);
	} 
	/* Create slider bar, if it do not already exist */
	$thenmapSlider = $thenmap.find('#thenmap-slider');
	if ( !$thenmapSlider.length ) {
		$thenmapSlider =
		$('<div/>', {
			id:   'thenmap-slider',
			class: 'dragdealer'
		});
		$timelineHandle = 
		$('<div/>', {
			class: 'handle'
		}).appendTo($thenmapSlider);
		$($thenmapSlider).insertAfter($thenmapMapContainer);
	} else {
		$timelineHandle = $thenmapSlider.find(".handle");
	}
	/* Create control bar, if asked */
	<?php 
	if ( $printControlbar->get() ) { ?>

		$thenmapControlbar = $('<menu/>', {
			class: 'controlbar'
		});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-rewind',
			title: '<?php echo(L::controlbar_rewindtitle); ?>',
			value: '<?php echo(L::controlbar_rewind); ?>',
			class: 'control'
		}).appendTo($thenmapControlbar).click(moveToStart);
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepback',
			title: '<?php echo(L::controlbar_stepbacktitle); ?>',
			value: '<?php echo(L::controlbar_stepback); ?>',
			class: 'control'
		}).appendTo($thenmapControlbar).click(moveLeft);
		var $playButton = $('<input/>', {
			type: 'button',
			id: 'thenmap-play',
			value: '<?php echo(L::controlbar_play); ?>',
			class: 'control'
		}).appendTo($thenmapControlbar).click(togglePlayPause);
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepforward',
			title: '<?php echo(L::controlbar_stepforwardtitle); ?>',
			value: '<?php echo(L::controlbar_stepforward); ?>',
			class: 'control'
		}).appendTo($thenmapControlbar).click(moveRight);
		$('<input/>', {
			type: 'button',
			id: 'thenmap-gotoend',
			title: '<?php echo(L::controlbar_gotoendtitle); ?>',
			value: '<?php echo(L::controlbar_gotoend); ?>',
			class: 'control'
		}).appendTo($thenmapControlbar).click(moveToEnd);

		$thenmap.append($thenmapControlbar);
	
	<?php
	} ?>
	/* END CREATE HTML MARKUP */	
	/***********************************************************************************************/

	/* SVG RELATED FUNCTIONS */
	/* Callback function for updating the map  */
	/* TODO: cache all styles and dates per http://jsperf.com/style-versus-jquery-css/8 */
	/* TODO: loop though nations ID, we know who they are. Skip each, no Jquery needed*/
	function printMap(y){
		$($thenmapsvg).attr("class", "y"+y);
		var yy = y+"-<?php echo $dateOffset->get(); ?>";
		$($nations).each(function() {
			if ( ( $(this).data("start") <= yy ) && ( yy <= $(this).data("end") ) ) {
				$(this)[0].style.visibility = "visible";
			} else {
				$(this)[0].style.visibility = "hidden";
			}

		});
	}
	/* END SVG RELATED FUNCTIONS */
	/***********************************************************************************************/


	/* LOAD SVG IMAGE */
	/* Fetch file */
	$.get("<?php echo "$svgFile?v=$cacheHash"; ?>", function(data) {
		// Get the SVG tag, ignore the rest
		var $svg = $(data).find('svg');

		// Add attributes
		$svg = $svg.attr("id", "thenmap-map");
		$svg.attr("preserveAspectRatio", "xMinYMin slice");

		/* Move width and height to container, so that the map scales */
		$mapWidth = $svg.attr('width');
		$mapHeight = $svg.attr('height');
		$($thenmapMapContainer).css("max-width",$mapWidth)
		$($thenmapMapContainer).css("max-height",$mapHeight)

	    /* Append image */
	    /* Each is used for callback functionality */
	    $svg.appendTo($thenmapMapContainer).each(function() {
	    	$thenmapsvg = this;
			$nations = $($thenmapsvg).find("g.nations > *");

			/* Initialize slider */
			initTimeline('thenmap-slider', firstYear, lastYear, startingYear);
			$($thenmapMapContainer).removeClass("loading");
			
			/* LOADER FOR QTIP */
			if (typeof $(document).qtip === 'undefined') {
				// Load the script
			    var script = document.createElement("SCRIPT");
				<?php if ( $debugMode ) { ?>
				script.src = 'js/jquery.qtip.min.js';
				<?php } else { ?>
			    script.src = '//cdnjs.cloudflare.com/ajax/libs/qtip2/2.1.1/basic/jquery.qtip.min.js';
				<?php } ?>
	    		script.type = 'text/javascript';
			    document.getElementsByTagName("head")[0].appendChild(script);
			} else {
				console.log("Qtip already loaded");
			}

			// Poll for qtip to come into existance
			var qtipReady = function(callback) {
				if ($(document).qtip) {
					callback();
				} else {
					window.setTimeout(function() { qtipReady(callback); }, 30);
				}
			};

			// Start...
			qtipReady(function() {
				$($nations).qtip({ 
					prerender: false,
					content: {
						text: function(event, api) {
							var id = [$(this).data("id")];
							var s = "<h3>"+nationTitles[id]+"</h3>";
							if ( nationFlags[id] ) {
								s += '<a href="//commons.wikimedia.org/wiki/File:'+nationFlags[id]["name"]+'" target="_blank"><img class="flag" width="40" src="'+nationFlags[id]["url"]+'"/></a>';
							}
							if ( (typeof nationDescriptions !== "undefined") && nationDescriptions[id] ) {
								s += '<p>'+nationDescriptions[id]+'</p>';
							}
							return s;
						}
					},
					position: {
						target: 'mouse', // Use the mouse position as the position origin
						adjust: {
							mouse: false, //Follow the mouse?
							x: -40,
							y: 15
						},
						corner: {
							tooltip: 'bottomMiddle'
						},
						effect: false,
					},
					hide: {
						fixed: true, // Let the user mouse into the tip
						delay: 120 // Don't hide right away so that they can mouse into it
					},
					show: {
			             solo: true
					}
				});

			});

	    });

	}, 'xml');
	/* END LOAD SVG IMAGE */
	/***********************************************************************************************/


/*********************************************************************************************/
/* Controls */
/*********************************************************************************************/
	/* Variables */	
	var $isPlaying = false;
	var timeline;
	var timer;
	
	// Function to draw timeline
	function initTimeline(elementId, year0, year1, yearSelected) {
		var yearSpan = year1 - year0;
		timeline = new Dragdealer(elementId, {
//			step: 1 / (yearSpan + 1), // How long is one step?
			x: 1 - (year1 - yearSelected) / yearSpan, // Set selected position
			snap: true,
			steps: yearSpan+1, // Number of steps
			animationCallback: function(x) {
				// Update handle and map
				currentYear  = year0 + x * yearSpan; // Get selected year
				$timelineHandle.text(currentYear); // Update handle text
				printMap(currentYear);
			},
			callback: function(x) {
				printMap(currentYear);
			}
		});
	}
		
	// Function to play
	function playTimeline() {
		timer = setInterval(function() {
			if ( currentYear < lastYear ) {
				timeline.setStep((currentYear++)-firstYear+2);
			} else {
				stopTimeline();
			}
		}, 500); // Set animation speed
		$isPlaying = true;
			<?php 
	if ( $printControlbar->get() ) { ?>
		$playButton.val("<?php echo(L::controlbar_pause); ?>");
		<?php } ?>
	}
	// Function to stop timeline animation
	function stopTimeline() {
		if ($isPlaying) {
			clearInterval(timer);
			$isPlaying = false;
			<?php 
	if ( $printControlbar->get() ) { ?>
		$playButton.val("<?php echo(L::controlbar_play); ?>");
		<?php } ?>
		}
	}
	
	// Control functions (go left, go right, etc)
	function moveRight() {
		if (currentYear < lastYear) {
			timeline.setStep((currentYear++)-firstYear+2);
		}
	}
	function moveLeft() {
		if (currentYear > firstYear){
			timeline.setStep((currentYear--)-firstYear);
		}
	}
	function moveToStart() {
		stopTimeline();
		timeline.setStep(0);
		currentYear = firstYear;
	}
	function moveToEnd() {
		stopTimeline();
		timeline.setStep(timeline.steps);
		currentYear = lastYear;
	}
	function togglePlayPause() {
			$isPlaying ? stopTimeline() : playTimeline();
	}

	// Keyboard commands
	$(window).keydown(function(e){
		if(e.which === 37){
			moveLeft();
		} else if(e.which === 39){
			moveRight();
		} else if(e.which === 35){
			moveToEnd();
		} else if(e.which === 36){
			moveToStart();
		} else if(e.which === 8){
			togglePlayPause();
		}
	});

});
	});
})(); <?php
/* Minify and send content */
if ( $debugMode ) {
	echo ob_get_clean();
} else {
	echo JShrink\Minifier::minify(ob_get_clean());
}
?>
