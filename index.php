<?php
header('Cache-Control: public');
$modify_time = filemtime(__FILE__);  
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");  

/* Class for handling all settings */
require_once('lib/setting.php');
require_once('lib/light-i18n.php');

$languages = array( "available"    => array ('sv', 'en', 'fi', 'de', 'fr'),
					"fallback"     => 'en',
					"type"         => Setting::LANGUAGE,
					);

$maps = array(	"available"    => array ('europe-ortho', 'world-robinson'),
				"aliases"      => array ('europe' => 'europe-ortho',
										 'world'  => 'world-robinson'),
				"fallback"     => 'world-robinson',
			);

/* Interface language */
$interfaceLanguage = new Setting( $languages );
$interfaceLanguage->set( filter_input(INPUT_GET,"lang",FILTER_SANITIZE_STRING) );
$_SESSION['lang'] = $interfaceLanguage->get();

/* Map language */ 
$mapLanguage = new Setting( $languages );
if ($_GET["mlang"]) {
	$mapLanguage->set( filter_input(INPUT_GET,"mlang",FILTER_SANITIZE_STRING) );
} else {
	$mapLanguage->set( $interfaceLanguage->get() );
}

/* Map type */
$map = new Setting( $maps );
$map->set( filter_input(INPUT_GET,"map",FILTER_SANITIZE_STRING) );

if ( file_exists ( 'maps/' . $map->get() . '-' . $mapLanguage->get() . '.svg' ) ) {
	$svgFile = 'maps/' . $map->get() . '-' . $mapLanguage->get() . '.svg';
} elseif ( file_exists ( 'maps/' - $map->get() . '-' . $languages["fallback"] . '.svg' ) ) {
	$svgFile = 'maps/' - $map->get() . '-' . $languages["fallback"] . '.svg';
} elseif ( file_exists ( 'maps/' - $maps["fallback"] . '-' . $mapLanguage->get() . '.svg' ) ) {
	$svgFile = 'maps/' - $maps["fallback"] . '-' . $mapLanguage->get() . '.svg';
} else {
	$svgFile = 'maps/world-robinson-en.svg';
}

/* Dates */
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1960 ) );
$firstYear->set( filter_input(INPUT_GET,"fYear",FILTER_SANITIZE_STRING) );
$lastYear      = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 2013 ) );
$lastYear->set( filter_input(INPUT_GET,"lYear",FILTER_SANITIZE_STRING) );
$startingYear  = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1965 ) );
$startingYear->set( filter_input(INPUT_GET,"sYear",FILTER_SANITIZE_STRING) );

if ( $lastYear <= $firstYear ) {
	$lastYear = $firstYear-1;
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

?><!DOCTYPE html>
<html lang="<?php $interfaceLanguage ?>" class="nojs">
	<head>
		<meta charset=utf-8 />
		<meta name="viewport" content="width=device-width">

		<title>Thenmap</title>

		<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
		<script>window.jquery || document.write('<script src="js/jquery.min.js"><\/script>')</script>
		
		<script src="js/dragdealer.js"></script>
		
		<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/normalize/2.1.3/normalize.min.css">
		<!--[if lt IE 9]>
			<script src="http://html5shiv.googlecode.com/svn/trunk/html5.js"></script>
		<![endif]-->
		<style>
.nojs .jsonly { display:none }

body {
	font-family: Arial, "sans-serif";
}

#thenmap-map-container{
	margin-left:auto;margin-right:auto;
}

#thenmap-slider {
	margin-top:.4em;
}

svg.thenmap-map {
	/* Let the map fill it's container. We will set the dimensions there instead, to allow for scaling*/
	width:100%;height:100%;
	border:1px solid whitesmoke;
}

.land {
	fill:lightgray;
	stroke:white;
	stroke-width:1px;
}

.controlbar {
	margin-left:auto;margin-right:auto;
	max-width:280px;
	padding:0;
}

.control {
	font-size: 16px;
	font-weight: bold;
	cursor: pointer;
	background-color: #C00;
	color: #fff;
	padding: 4px 8px;
	margin: 4px 2px;
	border-radius: 3px;
	display: inline-block;
	text-align: center;
	outline:0;border:0;
}
.control:hover {
	background-color: #8A0000;
}
#thenmap-play {width: 90px;}
#thenmap-stepback,#thenmap-stepforward, #thenmap-rewind,#thenmap-rewind {width: 30px;}

.dragdealer {
	position: relative;
	height: 30px;
	background: #EEE;
}
.dragdealer .handle {
	position: absolute;
	cursor: pointer;
}
.dragdealer .red-bar {
	width: 100px;
	height: 30px;
	background: #C00;
	color: #FFF;
	line-height: 30px;
	text-align: center;
}
.dragdealer .disabled {
	background: #898989;
}

@media (pointer:coarse) {
	.dragdealer, .dragdealer .red-bar {
		height: 50px;
		font-size:1.2em;
	}
}
		</style>
	
	</head>

<body>
	<section id="thenmap" class="jsonly">
	 	<div id="thenmap-map-container">
	 		<span id="thenmap-isloading">loading</span>
			<img id="thenmap-map" class="thenmap-map" style="visibility:hidden;" src="<?php echo $svgFile; ?>"/>
	 	</div>
		<div id="thenmap-slider" class="dragdealer">
			<div class="red-bar handle"></div>
		</div>
		<menu class="controlbar">
			<input type=button id="thenmap-rewind" class="control" value="<?php echo(L::controlbar_rewind); ?>" title="<?php echo(L::controlbar_rewindtitle); ?>"/>
			<input type=button id="thenmap-stepback" class="control" value="<?php echo(L::controlbar_stepback); ?>" title="<?php echo(L::controlbar_stepbacktitle); ?>"/>
			<input type=button id="thenmap-play" class="control" value="<?php echo(L::controlbar_play); ?>" />
			<input type=button id="thenmap-stepforward" class="control" value="<?php echo(L::controlbar_stepforward); ?>" title="<?php echo(L::controlbar_stepforwardtitle); ?>"/>
			<input type=button id="thenmap-gotoend" class="control" value="<?php echo(L::controlbar_gotoend); ?>" title="<?php echo(L::controlbar_gotoendtitle); ?>"/>
		</menu>
	</section>
	<article>
	<p>Work in progress by <a href="http://leowallentiin.se">Leo Wallentin</a> and Jens Finnäs, J++.</p>
	</article>
	<script>

document.documentElement.className = document.documentElement.className.replace("nojs","js");
/***********************************************************************************************/

/*************/
/* GLOBALS   */
/*************/
var currentYear = startingYear = <?php echo $startingYear->get(); ?>;
var firstYear    = <?php echo $firstYear->get(); ?>;
var lastYear     = <?php echo $lastYear->get(); ?>;
var dateOffset = "-07-01"; //Each map will show the world at this date of the year

/***********************************************************************************************/

/* This function does all the updating of the map */
function printMap(y,svg){

	var nations = $("g.nations > path"); //FIXME why can we use $(svg).find('g.nations > path')?
	$('#thenmap-map').attr("class", "thenmap-map replaced-svg y"+y);
	if (nations.length){
		$(nations).each(function() {
			var y1 = $(this).data("start");
			var y2 = $(this).data("end"); 
			if ((y1 <= (y+dateOffset)) && ((y+dateOffset) <= y2)) {
				$(this).css("visibility","visible");
			} else {
				$(this).css("visibility","hidden");
			}

		});
	} else {
		console.log('printMap: Map is not ready yet');
	}
}

/* Replace all SVG images with inline SVG */
$(document).ready(function(){

	var $thenmapmap = $('#thenmap-map');
	/* Replace img */
	var imgID = $thenmapmap.attr('id');
	var imgClass = $thenmapmap.attr('class');
	var imgURL = $thenmapmap.attr('src');

	$.get(imgURL, function(data) {
	    // Get the SVG tag, ignore the rest
	    var $svg = $(data).find('svg');

	    // Add replaced image's ID to the new SVG
	    if(typeof imgID !== 'undefined') {
	        $svg = $svg.attr('id', imgID);
	    }
	    // Add replaced image's classes to the new SVG
	    if(typeof imgClass !== 'undefined') {
	        $svg = $svg.attr('class', imgClass+' replaced-svg');
	    }

		/* Move width and height to container, so that the map scales */
		$mapWidth = $svg.attr('width');
		$mapHeight = $svg.attr('height');
		$("#thenmap-map-container").css("max-width",$mapWidth)
		$("#thenmap-map-container").css("max-height",$mapHeight)

	    // Replace image with new SVG
	    $thenmapmap.replaceWith($svg);

	    $thenmapsvg = $("#thenmap-map");

		$("#thenmap-isloading").css("display","none");
    	printMap(startingYear,$thenmapsvg);

	    //Add markers
/*		    var year = $($img).data("year");
	    if (typeof spots[year] !== 'undefined' ) {
	    	$(spots[year]).each(function(){
console.log(this);
				var coords = mapProjection.projectToCSS(this.lat, this.lon);
console.log(coords);
		    	addMarkerAt('y1959', coords.x, coords.y);
		    });
	    }*/

		//Add hosted stylesheet, if any
		<?php
		if ( $val = $dataCss->get() ) {
			$CssUrl = "\"css/$val.css\""
		 ?>
		 var url = <?php echo ($CssUrl); ?>;
			if(document.createStyleSheet) {
			try { document.createStyleSheet(url); } catch (e) { }
		} else {
			var css;
			css         = document.createElement('link');
			css.rel     = 'stylesheet';
			css.type    = 'text/css';
			css.media   = "all";
			css.href    = url;
			document.getElementsByTagName("head")[0].appendChild(css);
		}
		<?php } ?>

	}, 'xml');

});
/*********************************************************************************************/
/* Controls */
/*********************************************************************************************/
$(document).ready(function(){
	/* Variables */	
	/* cache elements */
	var $thenmap = $("#thenmap");
	var $thenmapsvg = $thenmap.find('#thenmap-map');
	var $timelineHandle = $thenmap.find("#thenmap-slider .handle");
	var $playButton = $thenmap.find("#thenmap-play");
	var $isPlaying = false;
	var timeline;
	var timer;
	
	// Function to draw timeline
	function initTimeline(elementId, year0, year1, yearSelected) {
		var yearSpan = year1 - year0;
		timeline = new Dragdealer('thenmap-slider', {
			step: 1 / (yearSpan + 1), // How long is one step?
			x: 1 - (year1 - yearSelected) / yearSpan, // Set selected position
			snap: true,
			steps: yearSpan+1, // Number of steps
			animationCallback: function(x) {
				// Update handle and map
				currentYear  = year0 + x * yearSpan; // Get selected year
				$timelineHandle.text(currentYear); // Update handle text
				printMap(currentYear,$thenmapsvg);
			},
			callback: function(x) {
				printMap(currentYear,$thenmapsvg);
			}
		});
	}
		
	// Function to play
	function playTimeline() {
		timer = setInterval(function() {
			if ( currentYear < lastYear ) {
				timeline.setStep((currentYear++)-firstYear+2);
				printMap(currentYear,$thenmapsvg);
			} else {
				stopTimeline();
			}
		}, 500) // Set animation speed, 2000 = 2 sec
		$isPlaying = true;
		$playButton.val("<?php echo(L::controlbar_pause); ?>");
	}
	// Function to stop timeline animation
	function stopTimeline() {
		clearInterval(timer);
		$isPlaying = false;
		$playButton.val("<?php echo(L::controlbar_play); ?>");
	}
	
	// Control functions (go left, go right, etc)
	function moveRight() {
		if (currentYear < lastYear) {
			timeline.setStep((currentYear++)-firstYear+2);
			printMap(currentYear,$thenmapsvg);
		}
	}
	function moveLeft() {
		if (currentYear > firstYear){
			timeline.setStep((currentYear--)-firstYear);
			printMap(currentYear,$thenmapsvg);
		}
	}
	function moveToStart() {
		timeline.setStep(0);
		currentYear = firstYear;
		printMap(currentYear,$thenmapsvg);
	}
	function moveToEnd() {
		timeline.setStep(lastYear-firstYear+1);
		currentYear = lastYear;
		printMap(currentYear,$thenmapsvg);
	}
	function togglePlayPause() {
			if ($isPlaying) {
			stopTimeline();
		} else {
			playTimeline();
		}
	}
	
	// Buttons
	$playButton.click(togglePlayPause);
	$thenmap.find("#thenmap-stepback").click(moveLeft);
	$thenmap.find("#thenmap-stepforward").click(moveRight);
	$thenmap.find("#thenmap-rewind").click(moveToStart);
	$thenmap.find("#thenmap-gotoend").click(moveToEnd);
	
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
	
	// Init timeline
	initTimeline('thenmap-slider', firstYear, lastYear, startingYear);
});
		</script>
	</body>
</html>
