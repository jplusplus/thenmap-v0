<?php
header("content-type: application/x-javascript; charset=utf-8");
//header('Cache-Control: public');

$modify_time = filemtime(__FILE__);
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");

/* LIBRARIES */
require_once('lib/setting.php');	/* 	 for handling all settings */
require_once('lib/light-i18n.php');	/* i18n for controls */
include_once('lib/Minifier.php');	/* JShrink minifyer */

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

/* Initiate automatically? Then all the end user need is to include the script, no js code at all */
$autoInit = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$autoInit->set( filter_input(INPUT_GET,"autoinit",FILTER_SANITIZE_STRING) );

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
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1946 ) );
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
?>

(function() {
	/* Add lazyloader to load js and css */
	<?php
	echo (file_get_contents('js/lazyload.js')); ?>
	/* ADD THENMAP CSS */
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
	/* ADD PREDEFINED DATA CSS, IF ANY.  */
	<?php
	if ( $val = $dataCss->get() ) {
		$CssUrl = '"'.$thenmapUrl . '/css/' . $val . ".css?c=" . $cacheHash . '"'
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

	/* SHOULD WE AUTOLOAD EVERYTHING FOR THE USER? */
	/* This will autoload jQuery, if not rpesent, and then attach the map to an element with the id "thenmap" */
	<?php
	if ($autoInit->get() ) { ?>
	/* JQUERY LOADER, TO ALLOW US TO LOAD JQUERY */
	/* ONLY IF NOT ALREADY LOADED */
	if (typeof jQuery === 'undefined') {
		// Load the script
		LazyLoad.js('//cdnjs.cloudflare.com/ajax/libs/jquery/1.10.2/jquery.min.js', function () {
			Thenmap.init("thenmap");
		});
	} else {
		Thenmap.init("thenmap");
	}
	<?php } ?>
})();

<?php
/* include dragdealer */
echo (file_get_contents('js/dragdealer.js'));
?>
/**********************************************************************************************************************/
var Thenmap = {

	/* DATA    */
	paths: <?php
		$file = 'maps/' . $map->get() . '/' . $map->get() . '-' . $mapLanguage->get() . '.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	flags: <?php
		$file = 'maps/' . $map->get(). '/' . $map->get() . '-flags.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	
	currentYear:	<?php echo $startingYear->get(); ?>,
	startingYear:	<?php echo $startingYear->get(); ?>,
	firstYear:		<?php echo $firstYear->get(); ?>,
	lastYear:		<?php echo $lastYear->get(); ?>,
	
	isPlaying:	false,
	timeline: false,	//dragdealer object
	timer: false,		//timer for autoplay

	section: false,// root element

	timelineHandle:false,	//element
	timelineHandleText:false,	//element
	svg:false,		//element
	mapcontainer: false, //element
	
	callback: false,	// extra callback function for animation (normally for updating custom buttons, etc)
						// Will be called like this: callback(currentYear)
	
	init: function(e,callback) {
		var self = this;
		this.section = document.getElementById(e);
		if (callback) {
			this.callback = callback;
		}

		/* Add map html, if not present */
		/* Users can choose to include all elements from start */
		this.buildHtml();
			
		/* LOAD SVG IMAGE */
		/* Fetch file */
		$.get("<?php echo "$svgFile?v=$cacheHash"; ?>", function(data) {

			// Get the SVG tag, ignore the rest
			var svg = data.getElementsByTagName('svg')[0];

			// Add attributes
			svg.id = "thenmap-map";
			svg.preserveAspectRatio = "xMinYMin slice";

			/* Append image */
			self.svg = self.mapcontainer[0].appendChild(svg);

			/* Move width and height to container, so that the map scales nicely to the browser  */
			/* Can only be done reliabily after svg is inserted */
			var bBox = svg.getBBox();
			self.mapcontainer[0].style["max-width"] = bBox.width;
			self.mapcontainer[0].style["max-height"] = bBox.height;

			/*Cache path styles and elements for performance*/
			for (var pid in self.paths) {
				var elem = document.getElementById(pid);
				if (elem) {
					self.paths[pid]["e"] = elem;
				} else {
					console.log("Error caching path "+pid)
				}
			}

			self.initTimeline('thenmap-slider');
			$(self.container).removeClass("loading");
			
			self.loadQtip();

		}, 'xml');//END loading svg
		// Keyboard commands
		$(window).keydown(function(e){
			if(e.which === 37){
				self.moveLeft();
				return false;
			} else if(e.which === 39){
				self.moveRight();
				return false;
			} else if(e.which === 35){
				self.moveToEnd();
				return false;
			} else if(e.which === 36){
				self.moveToStart();
				return false;
			} else if(e.which === 8){
				self.togglePlayPause();
				return false;
			}
		});
		return this;
	},

	playTimeline: function() {
		var self = this;
		this.timer = setInterval(function() {
			if ( self.currentYear < self.lastYear ) {
				self.timeline.setStep((self.currentYear++)-self.firstYear+2);
			} else {
				self.stopTimeline();
			}
		}, 500); // Set animation speed
		this.isPlaying = true;
	<?php 
	if ( $printControlbar->get() ) { ?>
		this.playButton.val("<?php echo(L::controlbar_pause); ?>");
		<?php } ?>
	},
	stopTimeline: function() {
		if (this.isPlaying) {
			clearInterval(this.timer);
			this.isPlaying = false;
		}
	<?php 
	if ( $printControlbar->get() ) { ?>
		this.playButton.val("<?php echo(L::controlbar_play); ?>");
		<?php } ?>
	},
	moveLeft: function() {
		if (this.currentYear > this.firstYear){
			this.timeline.setStep((this.currentYear--)-this.firstYear);
		}
	},
	moveRight: function() {
		if (this.currentYear < this.lastYear) {
			this.timeline.setStep((this.currentYear++)-this.firstYear+2);
		}
	},
	moveToStart: function() {
		this.stopTimeline();
		this.timeline.setStep(0);
		this.currentYear = this.firstYear;
	},
	moveToEnd: function() {
		this.stopTimeline();
		this.timeline.setStep(this.timeline.steps);
		this.currentYear = this.lastYear;
	},
	togglePlayPause: function() {
			this.isPlaying ? this.stopTimeline() : this.playTimeline();
	},
	/* Callback function for updating the map  */
	printMap: function (){
		
		// Set year to container
        this.svg.setAttribute("class", "y"+this.currentYear);
//		this.svg.className = "y"+this.currentYear;
		
		// Offset date
		var yy = this.currentYear+"-<?php echo $dateOffset->get(); ?>";
		
		//Loop through paths
		// Skip JQuery for performance
		for (var pid in this.paths) {

			var unknown = true;

			//Loop though nations, or until we found a nation that need this path
			i = this.paths[pid].length;
			while(i-- && unknown){
				if ( (this.paths[pid][i].f <= yy) && (yy <= this.paths[pid][i].t) ) {
					this.paths[pid]["e"].style.visibility = "visible";
//					this.paths[pid]["e"].className = this.paths[pid][i].c;
                    this.paths[pid]["e"].setAttribute("class", this.paths[pid][i].c);

					unknown = false;
	    		}
	    	}
	    	if (unknown) {
				if ("undefined" === typeof(this.paths[pid]["e"])) {
					console.log( "pid problem: "+pid );
				} else {
					this.paths[pid]["e"].style.visibility = "hidden";
				}
	    	}

		}

	},
	initTimeline: function (elementId) {
		var self = this;
		var yearSpan = this.lastYear - this.firstYear;
		this.timeline = new Dragdealer(elementId, {
			x: 1 - (this.lastYear - this.startingYear) / yearSpan, // Set selected position
			snap: true,
			steps: yearSpan+1, // Number of steps
			animationCallback: function(x) {
				// Update handle and map
				self.currentYear = self.firstYear + x * yearSpan; // Get selected year
				self.timelineHandle[0].textContent = self.currentYear;
				self.printMap();
				if (self.callback) {
					self.callback(self.currentYear);
				}
			},
			callback: function(x) {
				self.printMap();
				if (self.callback) {
					self.callback(self.currentYear);
				}
			}
		});
	},
	buildHtml: function() {	/* CREATE HTML MARKUP */	
		/* Create map container, if it do not already exist */
		this.mapcontainer = $(this.section).find('#thenmap-map-container');
		if ( !this.mapcontainer.length ) {
			this.mapcontainer =
			$('<div/>', {
				id:   'thenmap-map-container',
				class: 'loading'
			}).prependTo(this.section);
		} 
		/* Create slider bar, if it do not already exist */
		var sliderElement = $(this.section).find('#thenmap-slider');
		if ( !(sliderElement.length) ) {
			sliderElement =
			$('<div/>', {
				id:   'thenmap-slider',
				class: 'dragdealer'
			});
			this.timelineHandle = 
			$('<div/>', {
				class: 'handle'
			}).appendTo(sliderElement);
			$(sliderElement).insertAfter(this.mapcontainer);
		} else {
			this.timelineHandle = sliderElement.find(".handle");
		}
		
			/* Create control bar, if asked */
	<?php 
		if ( $printControlbar->get() ) { ?>
		var self = this;
		var controlbar = $('<menu/>', {
			class: 'controlbar'
		});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-rewind',
			title: '<?php echo(L::controlbar_rewindtitle); ?>',
			value: '<?php echo(L::controlbar_rewind); ?>',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveToStart(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepback',
			title: '<?php echo(L::controlbar_stepbacktitle); ?>',
			value: '<?php echo(L::controlbar_stepback); ?>',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveLeft(self)});
		self.playButton = $('<input/>', {
			type: 'button',
			id: 'thenmap-play',
			value: '<?php echo(L::controlbar_play); ?>',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.togglePlayPause(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepforward',
			title: '<?php echo(L::controlbar_stepforwardtitle); ?>',
			value: '<?php echo(L::controlbar_stepforward); ?>',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveRight(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-gotoend',
			title: '<?php echo(L::controlbar_gotoendtitle); ?>',
			value: '<?php echo(L::controlbar_gotoend); ?>',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveToEnd(self)});

		$(self.section).append(controlbar);
	
	<?php } ?>
	},
	loadQtip: function() { /* LOADER FOR QTIP */
		var self = this;
		if ("undefined" === typeof($.qtip)) {
			LazyLoad.js('//cdnjs.cloudflare.com/ajax/libs/qtip2/2.1.1/basic/jquery.qtip.min.js', function () {
				self.attachQtip();
			});
		} else {
			self.attachQtip();
		}
	},
	attachQtip: function() {
		var	nations = $(this.svg).find("g.nations > *");
		var self = this;
		$(nations).qtip({ 
			prerender: false,
			content: {
				text: function(event, api) {
					pid = api.target[0].id;
					i = self.paths[pid].length;
					while(i--){
						var yy = self.currentYear+"-<?php echo $dateOffset->get(); ?>";
						if ( (self.paths[pid][i].f <= yy) && (yy <= self.paths[pid][i].t) ) {
							var s = "<h3>"+self.paths[pid][i].n+"</h3>";
							var q;
							if ( q = self.paths[pid][i].q ) {
								if (self.flags[q]) {
									s += '<a href="//commons.wikimedia.org/wiki/File:'+self.flags[q].n+'" target="_blank"><img class="flag" width="40" src="//upload.wikimedia.org/wikipedia/commons/thumb/'+self.flags[q].i+'/'+self.flags[q].n+'/80px-'+self.flags[q].n+self.flags[q].s+'"/></a>';
								}
							}
							if ( (typeof nationDescriptions !== "undefined") && nationDescriptions[q] ) {
								s += '<p>'+nationDescriptions[q]+'</p>';
							}
							return s;
						}
					}

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

	}

}

<?php
/* Minify and send content */
if ( $debugMode ) {
	echo ob_get_clean();
} else {
	echo JShrink\Minifier::minify(ob_get_clean());
}
?>
