<?php
/* NB: JQuery is only loaded atfer the map is fully rendered and functional, and used for tooltips and other decorations.  The map shuld be fuly functional without it. We want to keep the initial loading, as well as the map updating mechanisms, as lightweight as possible.*/
header("Content-Type: application/javascript; charset=utf-8");
//header('Cache-Control: public');
$modify_time = filemtime(__FILE__);
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");
$cacheHash = md5($modify_time);

/* LIBRARIES */
require_once('lib/setting.php');	/* 	 for handling all settings */
include_once('lib/Minifier.php');	/* JShrink minifyer */

/* SETTINGS */
/* Paths */
$currentVersion = '0.1.0';
$staticUrl = '//static.thenmap.net';
$thenmapBaseUrl = '//' . $_SERVER['HTTP_HOST']; //'//www.thenmap.net'
$p = dirname($_SERVER['PHP_SELF']);
if ( $p && ('/' !==  $p) ) {
	$thenmapUrl = "$thenmapBaseUrl/$p";
}
$serverRoot = $_SERVER['DOCUMENT_ROOT'];


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

/* TODO calculate this when generating the map, and store in svg, or in a separate file */
$ratios = array (	'world-robinson' => '44%',
					'world-mollweide' => '44%',
					'europe-ortho' => '94%',
					'europe-caucasus-lcc' => '98%',
					'africa-laea' => '104%',
				);

/* Print controlbar (pause/play-button etc)? */
$printControlbar = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$printControlbar->set( filter_input(INPUT_GET,"controls",FILTER_SANITIZE_STRING) );

/* Print nation info-box in tooltips? */
$printInfobox = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$printInfobox->set( filter_input(INPUT_GET,"infobox",FILTER_SANITIZE_STRING) );

/* Initiate automatically? Then all the end user need is to include the script, no js code at all */
$autoInit = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$autoInit->set( filter_input(INPUT_GET,"autoinit",FILTER_SANITIZE_STRING) );

/* Debug mode? */
$debugMode = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "false" ) );
$debugMode->set( filter_input(INPUT_GET,"debug",FILTER_SANITIZE_STRING) /*|| "localhost" === $_SERVER["HTTP_HOST"]*/);

/* Interface language */
$interfaceLanguage = new Setting( $languages );
$interfaceLanguage->set( filter_input(INPUT_GET,"lang",FILTER_SANITIZE_STRING) );
//$_SESSION['lang'] = $interfaceLanguage->get();
require_once('lib/light-i18n.php');	/* i18n for controls */

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

$svgFile = $thenmapBaseUrl . '/maps/' . $map->get() . '/' . $map->get() . '.svg';

/* Dates */
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1946 ) );
$firstYear->set( filter_input(INPUT_GET,"fYear",FILTER_SANITIZE_STRING) );

$lastYear      = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 2014 ) );
$lastYear->set( filter_input(INPUT_GET,'lYear',FILTER_SANITIZE_STRING) );

$startingYear  = new Setting ( array ( 'type' => Setting::YEAR, "fallback" => 1980 ) );
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

/* Local data file */
$dataJson = new Setting ( array ( "type" => Setting::STRING ) );
$dataJson->set( filter_input(INPUT_GET,"data",FILTER_SANITIZE_STRING) );

/* Local data file */
$dataUnit = new Setting ( array ( "type" => Setting::STRING ) );
$dataUnit->set( filter_input(INPUT_GET,"dataUnit",FILTER_SANITIZE_STRING) );

/* Floor for sparklines in infoboxes */
$sparklineFloor = new Setting ( array ( "type" => Setting::INTEGER, "fallback" => 0 ) );
$sparklineFloor->set( filter_input(INPUT_GET,"sparklinefloor",FILTER_SANITIZE_STRING) );

/***********************************************************************************************/
/* Start buffer */
/***********************************************************************************************/
ob_start();

/***********************************************************************************************/
/************************************* JAVASCRIPT OUTPUT STARTS HERE ***************************/
/***********************************************************************************************/

/* include dragdealer */
echo (file_get_contents('js/dragdealer.js'));
/* include cross browser console.log in debug mode */
if ( $debugMode->get() ) {
	echo (file_get_contents('js/consolelog.js'));
}
?>

/**********************************************************************************************************************/
var Thenmap = {

	/* DATA    */
	paths: <?php
		$file = $serverRoot . '/maps/' . $map->get() . '/' . $mapLanguage->get() . '.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	flags: <?php
		$file = $serverRoot . '/maps/' . $map->get(). '/flags.json';
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
	svg:false,		//element
	mapcontainer: false, //element
	innercontainer: false, //element
	
	callback: false,	// extra callback function for animation (normally for updating custom buttons, etc)
						// Will be called like this: callback(currentYear)
						
	textPropName: false,
	
	init: function(e,callback) {
		var self = this;
		this.section = document.getElementById(e);
		if (callback) {
			this.callback = callback;
		}
		/* Check if we will be able to use textContent for updating text in dragdealer handle. IE<9 only understands innerText */
		self.textPropName = this.section.textContent === undefined ? 'innerText' : 'textContent';
		
		/* Polluting the environment a bit here, for our own convenience. Sorry for that. */
		/* Adding a global getElementsByClassName function*/
		if (!document.getElementsByClassName) {
			document.getElementsByClassName=function(cn) {
				var allT=document.getElementsByTagName('*'), allCN=[], i=0, a;
				while(a=allT[i++]) {
					a.className==cn ? allCN[allCN.length]=a : null;
				}
				return allCN
			}
		}

		/* Create map container, if it does not already exist */
		this.mapcontainer = document.getElementById('thenmap-map-container');
		if ( !(this.mapcontainer) ) {
			this.mapcontainer = document.createElement('div');
			this.mapcontainer.id = 'thenmap-map-container';
			this.mapcontainer.className = 'loading';

	
			var ajaxloader  = document.createElement('div');
			ajaxloader.className = 'ajaxloader';

			this.innercontainer  = document.createElement('div');
			this.innercontainer.id = 'thenmap-inner-container';

			var unsupported = document.createComment("[if lte IE 8]><i><?php echo(L::nosupport);?></i><![endif]");
			
			this.mapcontainer.appendChild(ajaxloader);
			this.mapcontainer.appendChild(unsupported);
			this.section.appendChild(this.mapcontainer);
			this.mapcontainer.appendChild(this.innercontainer);
		} else {
			this.innercontainer = document.getElementById('thenmap-inner-container');
		}
		this.innercontainer.style.paddingBottom = "<?php echo $ratios[$map->get()]; ?>";
		/* Create slider bar, if it do not already exist */
		var sliderElement = document.getElementById('thenmap-slider');
		if ( !(sliderElement) ) {
			sliderElement = document.createElement('div');
			sliderElement.id = 'thenmap-slider';
			sliderElement.className = 'dragdealer';

			this.timelineHandle = document.createElement('div');
			this.timelineHandle.className = 'handle';

			sliderElement.appendChild(this.timelineHandle);
			this.section.appendChild(sliderElement);
		} else {
			this.timelineHandle = sliderElement.getElementsByClassName("handle")[0];
		}

		/* LOAD SVG IMAGE */
		/* Fetch file */
		//this.ajax.get("<?php echo "$svgFile?v=$cacheHash"; ?>", function(data) { //	equivalent of $.get("url", function(data) {
		var xhr = this.createCORSRequest('<?php echo "$svgFile?v=$cacheHash"; ?>');
		if (!xhr) {
			this.debug("No CORS support");
		}
		xhr.onload = function() {
			var data = xhr.responseText;

			// Extract the SVG tag from the reply
			var tmp =  document.createElement('div');
			tmp.innerHTML = data;
			var svg = tmp.getElementsByTagName('svg')[0];

			// Add attributes
			svg.id = "thenmap-map";
//			svg.preserveAspectRatio = "xMinYMin slice";
			svg.removeAttribute("width");
			svg.removeAttribute("height");

			/* Append image */
			self.svg = self.innercontainer.appendChild(svg);

			/* Fix clipping problems in IE, by explicitly setting max-width */
//			var bBox = self.svg.getBBox();
//			if (bBox.width) {
//				self.svg.style["max-width"] = Math.min(bBox.width,1080) + "px";
//			}

			/*Cache path styles and elements for performance*/
			for (var pid in self.paths) {
				var elem = document.getElementById(pid);
				if (elem) {
					self.paths[pid]["e"] = elem;
				} else {
					self.debug("Error caching path "+pid+", map is probably not up to date with data file");
					delete self.paths[pid];
				}
			}

			self.mapcontainer.className = "";
			self.initTimeline('thenmap-slider');
			
			self.qtip.parent = self; // so that qtip functions can reference the thenmap object
			self.loadJQueryAndQtip();

		};//		}, 'xml');//END loading svg
		
		xhr.send();

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
        this.svg.setAttribute("class", "y"+this.currentYear); //.className does not work for svg in Chrome

		// Offset date
		var yy = this.currentYear+"-<?php echo $dateOffset->get(); ?>";
		
		//Loop through paths
		// Skip JQuery for performance
		for (var pid in this.paths) {

			var unknown = true;
			//Loop though nations, or until we found a nation that need this path
			i = this.paths[pid].length;
//			console.log(i);
//			this.debug(console.log(this.paths[pid]));
			while(i-- && unknown){
				if ( (this.paths[pid][i].s <= yy) && (yy <= this.paths[pid][i].e) ) {
                    this.paths[pid].e.setAttribute("class", this.paths[pid][i].c); //.className does not work for svg in Chrome
					unknown = false;
/*					if ("undefined" !== typeof(jQuery)) {
						var qtipE = this.paths[pid].e.getAttribute("aria-describedby");
						if (qtipE) {
							if ($("#"+qtipE).qtip('api').elements.tooltip.is(':visible')) {
								$("#"+qtipE).qtip('toggle', true);
							}
						}
					}*/
				}
			}
			if (unknown) {
				this.paths[pid].e.setAttribute("class", "n");
			}
		}

	},
	animationCallback: function(x) {
	},
	initTimeline: function (elementId) {
		var self = this;
		var yearSpan = this.lastYear - this.firstYear;
		this.timeline = new Dragdealer(document.getElementById(elementId), this.timelineHandle, {
			x: 1 - (this.lastYear - this.startingYear) / yearSpan, // Set selected position
			snap: true,
			steps: yearSpan+1, // Number of steps
			animationCallback: function(x) {
				// Update handle and map
				self.currentYear = self.firstYear + x * yearSpan; // Get selected year
				self.timelineHandle[self.textPropName] = self.currentYear;

				//Don't render the map on every step if we still have a long way to go
				var distance = Math.floor(this.steps * Math.abs(this.value.target-this.value.current));

				if (distance > 30) {
					/* 31-: Only print every tenth map*/
					if ( distance % 10 === 0 ) {
						self.printMap();
					}
				} else if (distance > 12) {
					/* 13-30: Only print every fifth map*/
					if ( distance % 5 === 0 ) {
						self.printMap();
					}
				} else if (distance > 3) {
					/* 4 - 12: Only print every third map */

					if ( distance % 3 == 0 ) {
						self.printMap();
					}
				} else {
					/* 0 - 4: Print every map */
					self.printMap();
				}
				if (self.callback) {
					self.callback(self.currentYear);
				}
			},
//			callback: function(x) {
//				console.log("BC");
			//Called at the end, but then anomationCallback will already have been called
//				self.printMap();
//				if (self.callback) {
//					self.callback(self.currentYear);
//				}
//				}
		});
	},
	buildControlbar: function() {	/* CREATE HTML MARKUP */	
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
			value: '⏮',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveToStart(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepback',
			title: '<?php echo(L::controlbar_stepbacktitle); ?>',
			value: '◂',
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
			value: '▸',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveRight(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-gotoend',
			title: '<?php echo(L::controlbar_gotoendtitle); ?>',
			value: '⏭',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveToEnd(self)});

		$(self.section).append(controlbar);
	
	<?php } ?>
	},
	loadJQueryAndQtip: function() {
		var self = this;
		if ("undefined" === typeof(jQuery)) {
			self.debug("loading jQuery...");
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo "$thenmapUrl/js/jquery.min.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/jquery/1.10.2/jquery.min.js";
			} ?>', function () {
				self.debug("done");
				self.loadQtip();
			});
		} else {
			self.loadQtip();
		}
	},
	loadQtip: function() { /* LOADER FOR QTIP */
		var self = this;
		this.buildControlbar(); //Build controlbar here, just for now (as we have JQuery)
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

		if ("undefined" === typeof($.qtip)) {
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo "$thenmapUrl/js/jquery.qtip.min.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/qtip2/2.1.1/basic/jquery.qtip.min.js";
			} ?>', function () {
				self.qtip.attachQtip();
			});
		} else {
			self.qtip.attachQtip();
		}
		/* load data local json */
		<?php
		if ($str = $dataJson->get() ) { ?>
		$.getJSON("<?php echo($str); ?>", function( data ) {
			self.qtip.dataJson = data;
			/* Local data is added to tooltips as plain text and sparklines */
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo "$thenmapUrl/js/jquery.sparkline.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/jquery-sparklines/2.1.2/jquery.sparkline.min.js";
			} ?>', function () {
			});
//			console.log(self.qtip.dataJson);
		});
		
		<?php } ?>
		
	},
	qtip: {
		/* Loop through an array of WikiData entities, to find the current one(s) */
		findCurrentWDItem: function(arr, key, callback) {
	
			var yy = this.currentYear+"-<?php echo $dateOffset->get(); ?>";
			var j = arr.length;
			var matches = [];
			while(j--){
				var sy = arr[j].s;
				if  (sy === undefined || sy === "") {
					sy = this.firstYear+'-01-01';
				}
				var ey = arr[j].e;
				if  (ey === undefined || ey === "") {
					ey = this.lastYear+'-12-31';
				}
				if ( ( sy <= yy) && (yy <= ey ) ) {
	//				matches.push(arr[i][key]);
	//console.log("match vid: "+j);
	//console.log("värde: "+arr[j]);
					if (arr[j][key]) {
						matches.push(arr[j][key]);
					}
				}
	//			console.log(matches);
			}

			callback && callback.call(this, matches);
		},
		makeList: function(list) {
			list = list.join("<?php echo(L::qtip_listseparator); ?>");
			return list;
		},
		printListItem: function(SingularLabel, PluralLabel, items) {
			s = '';
			if (items.length){
				s += '<dt>';
				if (items.length > 1) {
					s += PluralLabel;
				} else {
					s += SingularLabel;
				}
				s += '</dt><dd>'+this.makeList(items)+'</dd>';
			}
			return s;
		},
		makeImageSrc: function(f, width){
			return "//upload.wikimedia.org/wikipedia/commons/thumb/"+f.i+"/"+f.n+"/"+width+"px-"+f.n+f.s;
		},
		attachQtip: function() {
			var self = this;
			var	nations = $(self.parent.svg).find("g.nations > *");

			self.parent.tooltips = $(nations).qtip({ 
				prerender: false,
				content: {
					text: function(event, api) {
						pid = api.target[0].id;
						/* Loop through all nations attached to this path */
						var p = self.parent.paths[pid];
						var i = p.length;
						while(i--){
							var yy = self.parent.currentYear+"-<?php echo $dateOffset->get(); ?>";
							if ( (p[i].s <= yy) && (yy <= p[i].e) ) {
								var s = '';
								/* Header: Nation name, current year and type of regime*/
								s += "<header><h3>"+p[i].n+' <span class="currentYear">'+self.parent.currentYear+"</span></h3>";
								/* find current flag */
								if (p[i].f !== undefined) {
									self.findCurrentWDItem(p[i].f, "i", function(flag) {
										/* Look up this flag id in flag dict */
										if (self.parent.flags[flag] !== undefined) {
											f = self.parent.flags[flag];
											s += '<a href="//commons.wikimedia.org/wiki/File:'+f.n+'" target="_blank"><img class="flag" width="40" src="'+self.makeImageSrc(f,40)+'" srcset="'+self.makeImageSrc(f,60)+' 1.5x, '+self.makeImageSrc(f,80)+' 2x"/></a>';
										}
									});
								}
								<?php if ( $printInfobox->get() ) { ?>

								/* Find current governement */
								if (p[i].g !== undefined) {
									self.findCurrentWDItem(p[i].g, "n", function(gov) {
										if (gov.length) {
											s += '<p>'+gov.join(", ")+'</p>';
										}
									});
								}
								<?php } ?>

								s+="</header>";
								<?php if ( $printInfobox->get() ) { ?>

								s+="<dl>";
								/* Find current capital */
								if (p[i].h !== undefined) {
									self.findCurrentWDItem(p[i].h, "n", function(capital) {
										s += self.printListItem("<?php echo(L::qtip_capital); ?>","<?php echo(L::qtip_capitals); ?>", capital);
									});
								}
								/* Find current currency */
								if (p[i].u !== undefined) {
									self.findCurrentWDItem(p[i].u, "n", function(curr) {
										s += self.printListItem("<?php echo(L::qtip_currency); ?>","<?php echo(L::qtip_currencies); ?>", curr);
									});
								}
								s+="</dl>";
								/* Add a separator if we have both an infobox and other data */
								if (self.dataJson !== undefined) {
									s += "<hr style='clear:both' />";
								}
								<?php } ?>

								/* do we have a data json? */
								if (self.dataJson !== undefined) {
									/*leta efter matchande klasser */
									$(self.dataJson).each(function(row) {
										var classStr = p[i].c;
										$(classStr.split(" ")).each(function(n, c) {
											if (self.dataJson[c] !== undefined) {
												arrIndex = self.parent.currentYear - self.parent.firstYear;
												if (self.dataJson[c]) {
													s += "<p>";
													if (self.dataJson[c][arrIndex]) {
														s += self.dataJson[c][arrIndex]+"&nbsp;<?php echo($dataUnit->get()); ?>";
													} else {
														s += "<?php echo(L::qtip_novalueavailable); ?>";
													}
													s += '</p><div class="sparklineContainer"><span class="firstyear year"><?php echo $firstYear->get(); ?></span><span class="sparkline"></span><span class="lastyear year"><?php echo $lastYear->get(); ?></span></div>';
												}
												/* Can we know when this element is ready? */
												/* TODO continue polling until ready */
												setTimeout(function(){
													for ( var rm=[], i=0; i < arrIndex; i++ ){
														rm[i] = "#000";
													}
													rm[arrIndex] = "#C00";
													$(api.tooltip[0]).find(".sparkline").sparkline(
																							self.dataJson[c], {
																							barColor: "#000",
																							colorMap: rm,
																							fillColor: "",
																							disableTooltips: true,
																							type: "bar",
																							chartRangeMin:<?php echo $sparklineFloor->get(); ?>
																							});
												}, 70);
											}
										});
									});
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
					delay: 140 // So that users can mouse into tooltop
				},
				show: {
				     solo: true
				}
//				events: {
					/* Run before tooltip is created */
//					show: function(event, tt) {
//					}
					//FIXME: check if this is what we need, rather than timeouts
//					visible: function(event, tt) {
//						$(".sparkline").sparkline();
//					}
//				}
			});
		}
	},
	createCORSRequest: function(url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// XHR for Chrome/Firefox/Opera/Safari.
			xhr.open('GET', url, true);
		} else if (typeof XDomainRequest != "undefined") {
			// XDomainRequest for IE.
			xhr = new XDomainRequest();
			xhr.open('GET', url);
		} else {
			// CORS not supported.
			xhr = null;
		}
		return xhr;
	},
	svgSupported: function() {
		return !! document.createElementNS &&
			   !! document.createElementNS(SVG.ns,'svg').createSVGRect
	},
	debug: function(mes) {
		<?php
		if ( $debugMode->get() ) { ?>
		console.log(mes + "\nIn function:"+arguments.callee.caller.name);
		<?php } ?>
	
	}

};

(function() {
	/* Add lazyloader to load js and css */
	<?php echo (file_get_contents('js/lazyload.js')); ?>
<?php
	/* ADD THENMAP CSS */
	if ( $debugMode->get() ) { ?>
		LazyLoad.css("<?php echo $thenmapUrl; ?>/css/default.css?c<?php echo $cacheHash; ?>");
<?php	
	} else { ?>
		LazyLoad.css("<?php echo $thenmapUrl; ?>/css/default.min.css?c<?php echo $cacheHash; ?>");
<?php
	} ?>
	
	/* Add IE specific stylesheet */
	/* alternative approach: http://stackoverflow.com/questions/2041495/create-dynamic-inline-stylesheet */
	/*      var el= document.createElement('style'); */
	/*      el.type= "text/css";*/ 
	/*     if(el.styleSheet) { el.styleSheet.... = ...};//IE only */
	if (document.styleSheets[0].addImport) {
		 document.styleSheets[0].addImport("<?php echo $thenmapUrl; ?>/css/ie.css");
	}

	/* ADD PREDEFINED DATA CSS, IF ANY.  */
	<?php
	if ( $val = $dataCss->get() ) {
		$CssUrl = '"'.$thenmapUrl . '/css/' . $val . ".css?c" . $cacheHash . '"'
	 ?>
	LazyLoad.css("<?php echo $thenmapUrl; ?>/css/<?php echo $val; ?>.css?c<?php echo $cacheHash; ?>");
	<?php } ?>

	/* SHOULD WE AUTOLOAD EVERYTHING FOR THE USER? */
	<?php
	if ($autoInit->get() ) { ?>
		Thenmap.init("thenmap");
	<?php } ?>
})();

<?php
/* Minify and send content */

if ( $debugMode->get() ) {
	echo('console.log("Running in debug mode");');
	echo("//".$debugMode->get());
	echo ob_get_clean();
} else {
	echo JShrink\Minifier::minify(ob_get_clean());
}
?>
