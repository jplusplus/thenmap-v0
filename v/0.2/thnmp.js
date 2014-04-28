<?php
/* NB: JQuery is only loaded atfer the map is fully rendered and functional, and used for tooltips and other decorations.
  The map shuld be fuly functional without it. We want to keep the initial loading, as well as the map updating mechanisms, as lightweight as possible.*/
header("Content-Type: application/javascript; charset=utf-8");
//header('Cache-Control: public');
$modify_time = filemtime(__FILE__);
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");
$cacheHash = md5($modify_time);

/* LIBRARIES */
require_once('lib/setting.php');	/* for handling all settings */
require_once('lib/Minifier.php');	/* JShrink minifyer */

/* SETTINGS */
/* Paths */
$currentVersion = '0.2.0';
//$staticUrl = '//static.thenmap.net';
$thenmapBaseUrl = '//' . $_SERVER['HTTP_HOST']; //'//www.thenmap.net'
$p = dirname($_SERVER['PHP_SELF']);
if ( $p && ('/' !==  $p) ) {
	$thenmapUrl = "$thenmapBaseUrl/$p/";
}

$thenmapPath = dirname(__FILE__);

/* Languages*/
$languages = array( 'available'    => array ('sv','en','fi','se'),
					//Languages with large Wikipedias. Other languages will require extensive local translations
					"fallback"     => 'sv',
					"type"         => Setting::LANGUAGE,
					);

/* Maps */
$maps = array(	'available'    => array ('sweden','sweden-split',
										),
				'aliases'      => array ('europe'    => 'europe-ortho',
										 'world'     => 'world-robinson',
 										 'robinson'  => 'world-robinson',
 										 'mollweide' => 'world-mollweide',
										 'africa'    => 'africa-laea',
										 'europe-caucasus' => 'europe-caucasus-lcc',
										 'sverige'   => 'sweden'
										),
				'fallback'     => 'sweden',
				'data'         => array( 'sweden' => 'sweden',
										 'sweden-split' => 'sweden',
									   )
			);

/* TODO calculate this when generating the map, and store in svg, or in a separate file */
$ratios = array (	'world-robinson' => '44%',
					'world-mollweide' => '44%',
					'europe-ortho' => '94%',
					'europe-caucasus-lcc' => '98%',
					'africa-laea' => '104%',
					'sweden' => '203%',
					'sweden-split' => '69%'
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

/* Map and interface language */
$language = new Setting( $languages );
$language->set( filter_input(INPUT_GET,"lang",FILTER_SANITIZE_STRING) );
//$_SESSION['lang'] = $language->get();
require_once('lib/light-i18n.php');

/* Map type */
$map = new Setting( $maps );
$map->set( filter_input(INPUT_GET,"map",FILTER_SANITIZE_STRING) );

$mapDirectory  = $thenmapUrl . '/maps/' . $maps['data'][$map->get()] . '/';
$mapPath  = $thenmapPath . '/maps/' . $maps['data'][$map->get()] . '/';
$i18nDirectory = $thenmapPath . '/lang/' . $language->get() . '/';
$svgFile = $mapDirectory . $map->get() . '.svg';

/* Dates */
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1973 ) );
$firstYear->set( filter_input(INPUT_GET,"fYear",FILTER_SANITIZE_STRING) );

$lastYear      = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 2014 ) );
$lastYear->set( filter_input(INPUT_GET,'lYear',FILTER_SANITIZE_STRING) );

$startingYear  = new Setting ( array ( 'type' => Setting::YEAR, "fallback" => 1973) );
$startingYear->set( filter_input(INPUT_GET,'sYear',FILTER_SANITIZE_STRING) );

$dateOffset    = new Setting ( array ( 'fallback' => '07-01') );
$dateOffset->set( filter_input(INPUT_GET,'offset',FILTER_SANITIZE_STRING) );

$numSteps    = new Setting ( array ( 'fallback' => '1') );
$numSteps->set( filter_input(INPUT_GET,'steps',FILTER_SANITIZE_STRING) );

if ( $lastYear <= $firstYear ) {
	$lastYear = $firstYear+1;
}

if ( $startingYear < $firstYear ) {
	$startingYear = $firstYear;
}

if ($startingYear > $lastYear ) {
	$startingYear = $lastYear;
}

/* Local data file */
$dataJson = new Setting ( array ( "type" => Setting::STRING ) );
$dataJson->set( filter_input(INPUT_GET,"data",FILTER_SANITIZE_STRING) );
$dataUnit = new Setting ( array ( "type" => Setting::STRING ) );
$dataUnit->set( filter_input(INPUT_GET,"dataUnit",FILTER_SANITIZE_STRING) );

/* Floor for sparklines in infoboxes */
$sparklineFloor = new Setting ( array ( "type" => Setting::INTEGER, "fallback" => 0 ) );
$sparklineFloor->set( filter_input(INPUT_GET,"sparklinefloor",FILTER_SANITIZE_STRING) );

/* Print points (circles) for each country? Useful for dispolaying various data on top */
$printPoints = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "false" ) );
$printPoints->set( filter_input(INPUT_GET,"printPoints",FILTER_SANITIZE_STRING) );


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

	/* Infobox data */
	paths: <?php
		$file = $mapPath . $language->get() . '.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	files: <?php
		$file = $mapPath .  'files.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	props: <?php
		$file = $mapPath .  'props-' . $language->get() . '.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,

	/* i18n*/
	plurals: <?php
		$file = $i18nDirectory .  'plurals.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,

	/* boundaries */
	startingYear:	<?php echo $startingYear->get(); ?>,
	firstYear:		<?php echo $firstYear->get(); ?>,
	lastYear:		<?php echo $lastYear->get(); ?>,

	/* timeline */
	currentYear:	<?php echo $startingYear->get(); ?>,	
	isPlaying:	false,
	timeline: false,	//dragdealer object
	timer: false,		//timer for autoplay

	visiblePaths: [], //Array of visible nations

	/* html elements*/
	section: false,// root element

	timelineHandle:false,	//element
	svg:false,		//element
	mapcontainer: false, //element
	innercontainer: false, //element
	
	callback: false,	// extra callback function for animation (normally for updating custom buttons, etc)
						// Will be called like this: callback(currentYear)
						
	textPropName: false, //should we use innerText or textContent? 
	
	init: function(e,callback) {
		var self = this;
		this.section = document.getElementById(e);
		if (typeof callback !== 'function') {
			this.callback = callback;
		}
		/* Check if we will be able to use textContent for updating text in dragdealer handle. IE LTE 9 only understands innerText */
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

			var unsupported = document.createComment("[if lte IE 8]><i><?php echo(L::nosupport); ?></i><![endif]");
			
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
		var xhr = this.createCORSRequest('<?php echo "$svgFile?v=$cacheHash"; ?>');
		if (!xhr) {
			this.debug("No CORS support");
		}
		xhr.onload = function() {

			// Extract the SVG tag from the reply
			var tmp =  document.createElement('div');
			tmp.innerHTML = xhr.responseText;
			var svg = tmp.getElementsByTagName('svg')[0];

			// tidy up svg tag
//			svg.id = "thenmap-map";
//			svg.preserveAspectRatio = "xMinYMin slice";
			svg.removeAttribute("width");
			svg.removeAttribute("height");


			/* Append image */
			/* We need to do this before calculating points */
			self.svg = self.innercontainer.appendChild(svg);

			/* Cache paths */
			for (var pid in self.paths) {
				var elem = svg.getElementById(pid);
				if (elem) {
					self.paths[pid]["e"] = elem;

					//TODO: hardcode this
					/* set all nations classes to each path, to avoid flickering when moving back and forth */
					classnames = '';
					var l = self.paths[pid].length;
					while (l--) {
						classnames = classnames + " " + self.paths[pid][l].c;
					}
					classnames = classnames + " n";

					self.paths[pid].h = classnames;

					elem.setAttribute("class", classnames); 
				} else {
					self.debug("Error caching path "+pid+", map is probably not up to date with data file");
					delete self.paths[pid];
				}
			}

			<?php 
			if ( $printPoints->get() ) { ?>
			/* First, loop through all presaved points*/
			var pointsLayer = self.svg.getElementById("points");
			var points = pointsLayer.getElementsByTagName("circle");
			for (var i=0, l=points.length; i < l; i++) {
				var n = "n"+points[i].getAttribute("data-id");
				if (n in self.paths) {
					self.paths[n]["p"] = points[i];
				}
			}
			/* Then calculate points for paths missings them */
			/* Create point */
			var svgNS = "http://www.w3.org/2000/svg";
			/* Attach where needed */
			for (var pid in self.paths) {

				if (self.paths[pid].p === undefined ) {
						if ( self.paths[pid].e !== undefined ) {
							var xy = self.getPointOfPath(self.paths[pid].e);
							var shape = document.createElementNS(svgNS, "circle");
							shape.setAttributeNS(null, "r",  0);
							shape.setAttributeNS(null, "cx", xy.x);
							shape.setAttributeNS(null, "cy", xy.y);
							shape.setAttributeNS(null, "data-id", pid.substring(1));
//							shape.setAttributeNS(null, "class", "n");
							
							var title = document.createElementNS(svgNS, "title");//TODO test
							title.textContent = self.paths[pid][0].n;//TODO test
							shape.appendChild(title)//TODO test

							pointsLayer.appendChild(shape);
							self.paths[pid]["p"] = shape;
						}
				} else {
					self.paths[pid].p.setAttributeNS(null, "r", 0);
				}
			}
			<?php } else { ?>

			var points = svg.getElementById("points");
			if (points !== null) {
				points.setAttributeNS(null, "visibility", "hidden");
			}
			<?php } ?>

			self.mapcontainer.className = "";

			self.initTimeline('thenmap-slider');

//			self.printMap();

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
				self._moveRight();
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
	_moveRight: function() {
		this.timeline.setStep((this.currentYear++)-this.firstYear+2);
	},
	moveRight: function() {
		if (this.currentYear < this.lastYear) {
			this._moveRight();
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
		var vbn = []; //cache visible paths
		for (var pid in this.paths) {

			var unknown = true;

			//Loop through paths, until we found a nation that need this path
			var i = this.paths[pid].length;
			while(i-- && unknown){
				if ( ( ( this.paths[pid][i].s || "0" ) <= yy) && (yy <= ( this.paths[pid][i].e || "9" ) ) ) {
					vbn.push(pid);

                    if ( this.paths[pid].currNat !== i ) {
	                    this.paths[pid].e.setAttribute("class", this.paths[pid][i].c); //.className does not work for svg in Chrome
    	                this.paths[pid].currNat = i;
    	            }
<?php if ($printPoints->get()) { ?>
//					if ("p" in this.paths[pid]) {
//						this.paths[pid].p.setAttribute("class", "point");
//					}
<?php } ?>					
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
				if (this.visiblePaths.indexOf(pid) > -1) {

					/* By keeping all class names here, we avoid some flickering when moving back and forth */
					this.paths[pid].e.setAttribute("class", this.paths[pid].h); 

					this.paths[pid].currNat = null;

				}
<?php if ($printPoints->get()) { ?>
//				if ("p" in this.paths[pid]) {
//					this.paths[pid].p.setAttribute("class", "n");
//				}
<?php } ?>
			}
		}
		this.visiblePaths = null;
		this.visiblePaths = vbn;

	},
	animationCallback: function(x) {
	},
	initTimeline: function (elementId) {
		var self = this;
		var yearSpan = (this.lastYear - this.firstYear);

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
	buildControlbar: function() {	/* CREATE HTML MARKUP and keyboard shortcuts */	
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
			} else if(e.which === 32){
				self.togglePlayPause();
				return false;
			}
		});
	
	<?php } ?>
	},
	loadJQueryAndQtip: function() {
		var self = this;
		if ("undefined" === typeof(jQuery)) {
			self.debug("loading jQuery...");
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo $thenmapUrl . "js/jquery.min.js";
			} else {
				echo "//code.jquery.com/jquery-1.11.0.min.js";
			} ?>', function () {
				self.debug("done");
				self.loadQtip();
				self.buildControlbar(); //Build controlbar here, just for now (as we have JQuery)
			});
		} else {
			self.loadQtip();
			self.buildControlbar(); //Build controlbar here, just for now (as we have JQuery)
		}
	},
	loadQtip: function() { /* LOADER FOR QTIP */
		var self = this;

		/* Load the actual QTIP library */
		if ("undefined" === typeof($.qtip)) {
			self.debug("loading qtip2...");
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo $thenmapUrl . "js/jquery.qtip.min.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/qtip2/2.2.0/basic/jquery.qtip.min.js";
			} ?>', function () {
				self.debug("done. Attaching...");
				self.qtip.attachQtip();
			});
		} else {
			self.debug("Qtip2 already loaded. Attaching...");
			self.qtip.attachQtip();
		}

		/* load data local json */
		<?php
		if ($str = $dataJson->get() ) { ?>
		self.debug("loading dataJson...");
		$.getJSON("<?php echo($str); ?>", function( data ) {
			self.qtip.dataJson = data;
			/* Local data is added to tooltips as plain text and sparklines */
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo $thenmapUrl . "js/jquery.sparkline.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/jquery-sparklines/2.1.2/jquery.sparkline.min.js";
			} ?>', function () {
			});
			self.debug("done");
		});
		
		<?php } ?>
		
	},
	qtip: {
		propertyLabels: <?php echo (L::qtip_properties); ?>,
		/* Loop through an array of WikiData entities, to find the current one(s) */
		findCurrentPropValue: function(arr, key, callback) {
	
			var yy = this.parent.currentYear+"-<?php echo $dateOffset->get(); ?>";
			var j = arr.length;
			var matches = [];
			while(j--){
				if ( ( ( arr[j].s || "0" ) <= yy) && (yy <= ( arr[j].e || "9" ) ) ) {
					matches.push(arr[j]);
				}
			}

			callback && callback.call(this, matches, key);
		},
		makeList: function(list) {
			var list = list.join("<?php echo(L::qtip_listseparator); ?>");
			return list;
		},
		printListItem: function(translationKey, items) {
			var s = '';
			var numberOfItems = items.length;
			if ( numberOfItems ) {
				s += "<dt>";

				var result = false;
				var pluralRule;
				for (var rule in this.parent.plurals) {
					if (!result) {
						result = pluralRuleParser(this.parent.plurals[rule], numberOfItems);
						if (result) {
							pluralRule = rule;
						}
					}
				}
				s += this.propertyLabels[translationKey][pluralRule];
				s += '</dt><dd>'+this.makeList(items)+'</dd>';
			}
			return s;
		},
		makeImageSrc: function(f, width){
			return "//upload.wikimedia.org/wikipedia/commons/thumb/"+f.i+"/"+f.n+"/"+width+"px-"+f.n+f.s;
		},
		attachQtip: function() {
			var self = this;
//			var	nations = $(self.parent.svg).find("g.nations > *");

			$.each(self.parent.paths, function(){

				var path = this;

				$(path.e).qtip({ 

					prerender: false,

					content: {

						text: function(event, api) {

							var s = '';

							/* Get the nation currently associated with this path, call it p [sic!] */
							var p = path[path.currNat];

							if (typeof p === 'undefined') {
								/* This should never happen */
								self.parent.debug("Selected path missing current nation");
								console.log(path);
								p = path[0];
							}


							/* Header: Nation name, current year  */
							s += "<header><h3>"+p.n+' <span class="currentYear">'+self.parent.currentYear+"</span></h3>";

							/* Image */
							/* Usually a flag, coat of arms, or similar */
							if (typeof p.f === 'object') {
								self.findCurrentPropValue(p.f, null, function(file) {
									if (file.length) {
										/* Use only first file */
										f = self.parent.files[file[0]["i"]];
										/* Look up this file id in the files dict */
										if (typeof f === 'object') {
											s += '<a href="//commons.wikimedia.org/wiki/File:'+f.n+'" target="_blank"><img class="flag" width="40" src="'+self.makeImageSrc(f,40)+'" srcset="'+self.makeImageSrc(f,60)+' 1.5x, '+self.makeImageSrc(f,80)+' 2x"/></a>';
										}
									}
								});
							}
							s+="</header>";

							<?php if ( $printInfobox->get() ) { ?>

							s+="<dl>";

							/* Loop through all properties */
							$.each(p.p, function(k,o){
								/* Extract the current one(s) */
								self.findCurrentPropValue(o, k, function(currentvals, k) {
									/* put them all in one array*/
									var currentvalsArray = [];
									$.each(currentvals,function(nr,val){
										/* Non reusable property, name is in 'n' */
										if (typeof val.n === "string") {
											currentvalsArray.push(val.n);
										/* Reusable property, name is in a separate dictionary, as props[p][qid]*/
										} else if (typeof val.q === "string") {
											currentvalsArray.push(self.parent.props[k][val.q]);
										}
									});

									s += self.printListItem(k, currentvalsArray);

								});
							});

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
									var classStr = p.c;
									$(classStr.split(" ")).each(function(n, c) {
										if (self.dataJson[c] !== undefined) {
											var arrIndex = self.parent.currentYear - self.parent.firstYear;
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

						}, //END text:
						button: true
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
					},
	//				position: {
	//					viewport: self.innerContaner
	//				}
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
	getPointOfPath: function(path) {
		var bbox = path.getBBox();
		var x = Math.floor(bbox.x + bbox.width/2.0);
		var y = Math.floor(bbox.y + bbox.height/2.0);
		return ({x:x,y:y});
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

	LazyLoad.css('<?php
			if ( $debugMode->get() ) {
				echo $thenmapUrl . "css/default.css";
			} else {
				echo $thenmapUrl . "css/default.min.css";
			} ?>?c<?php echo $cacheHash; ?>"');
	
	/* Add IE specific stylesheet */
	/* alternative approach: http://stackoverflow.com/questions/2041495/create-dynamic-inline-stylesheet */
	/*      var el= document.createElement('style'); */
	/*      el.type= "text/css";*/ 
	/*     if(el.styleSheet) { el.styleSheet.... = ...};//IE only */
	if (document.styleSheets[0].addImport) {
		 document.styleSheets[0].addImport("css/ie.css");
	}

	/* SHOULD WE AUTOLOAD EVERYTHING FOR THE USER? */
	<?php
	if ( $autoInit->get() ) { ?>
		Thenmap.init("thenmap");
	<?php } ?>
})();

/* include plural rules parser*/ //FIXME behövs inte förrän på slutet, egentligen, och bara om infoboxar ska visas
<?php echo (file_get_contents('js/CLDRPluralRuleParser.js')); ?>

<?php
/* Minify and send content */
if ( $debugMode->get() ) {
	echo('console.log("Running in debug mode");');
	echo ob_get_clean();
} else {
	echo JShrink\Minifier::minify(ob_get_clean());
}
