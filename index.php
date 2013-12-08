<?php
header('Cache-Control: public');

$modify_time = filemtime(__FILE__);  
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");  

/* Class for handling all settings */
require_once('lib/setting.php');

$languages = array( "available"    => array ("sv","en","fi","fr","de","es","ru","it","nl","pl","zh","pt","ar","ja","fa","no","he","tr","da","uk","ca","id","hu","vi","ko","et","cs","hi","sr","bg"),
					"fallback"     => 'sv',
					"type"         => Setting::LANGUAGE,
					);

$maps = array(	"available"    => array ('europe-ortho', 'world-robinson', 'world-mollweide', 'africa-laea','europe-caucasus-lcc'),
				"aliases"      => array ('europe' => 'europe-ortho',
										 'africa' => 'africa-laea',
										 'world'  => 'world-robinson'),
				"fallback"     => 'world-robinson',
			);

/* Interface language */
$interfaceLanguage = new Setting( $languages );
$interfaceLanguage->set( filter_input(INPUT_GET,"lang",FILTER_SANITIZE_STRING) );

/* Map language */ 
$mapLanguage = new Setting( $languages );
/* If no map language given, but lang is explicitly set, use lang */
if ( isset( $_GET["lang"]) && !isset($_GET["mlang"]) ) {
	$mapLanguage->set( $interfaceLanguage->get() );
} else {
	$mapLanguage->set( filter_input(INPUT_GET,"mlang",FILTER_SANITIZE_STRING) );
}
/* Map type */
$map = new Setting( $maps );
$map->set( filter_input(INPUT_GET,"map",FILTER_SANITIZE_STRING) );

/* Dates */
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1946 ) );
$firstYear->set( filter_input(INPUT_GET,"fYear",FILTER_SANITIZE_STRING) );
$lastYear      = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 2013 ) );
$lastYear->set( filter_input(INPUT_GET,"lYear",FILTER_SANITIZE_STRING) );
$startingYear  = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1965 ) );
$startingYear->set( filter_input(INPUT_GET,"sYear",FILTER_SANITIZE_STRING) );

/* Data sets */
$dataCss = new Setting ( array ( "type" => Setting::STRING ) );
$dataCss->set( filter_input(INPUT_GET,"dataCss",FILTER_SANITIZE_STRING) );

?><!DOCTYPE html>
<html lang="<?php $interfaceLanguage ?>" class="nojs">
	<head>
		<meta charset=utf-8 />
		<meta name="viewport" content="width=device-width">

		<title>Thenmap</title>

		<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/normalize/2.1.3/normalize.min.css">

		<script src=//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js></script>
		<!--[if lt IE 9]>
			<script src=http://html5shiv.googlecode.com/svn/trunk/html5.js></script>
		<![endif]-->

	</head>

<body ontouchstart="" onmouseover="">
<?php /* http://stackoverflow.com/questions/8330559/hover-effects-using-css3-touch-events */ ?>
	<section id="thenmap">
	 	<div id="thenmap-map-container" class="loading">
	 			<div class="placeholder"></div>
	 			<div class="ajaxloader"></div>
	 			<!--[if lt IE 9]><em>Sorry, Thenmap does not (yet) work in older versions of Internet Explorer. Please upgrade, or use (any) another browser.</em><![endif]-->
	 			<noscript><em>Sorry, you will need javascript to view this map!</em></noscript>
	 	</div>
		<div id="thenmap-slider" class="dragdealer">
			<div class="handle"></div>
		</div>
	</section>
	<article>
	<p>Try one of these:</p>
	<ul>
	<li>Country names in <a href="http://www.thenmap.net?mlang=ar">Arabic</a>, <a href="http://www.thenmap.net?mlang=fr">French</a>, <a href="http://www.thenmap.net?mlang=fi">Finnish</a>, <a href="http://www.thenmap.net?mlang=de">German</a>, <a href="http://www.thenmap.net?mlang=en">English</a> or <a href="http://www.thenmap.net?mlang=sv">Swedish</a>
	<li><a href="http://www.thenmap.net?map=europe&amp;fYear=1946&amp;sYear=1946">A European map</a> or a <a href="http://www.leowallentin.se/thenmap?map=world">world map</a>. Or an <a href="http://www.leowallentin.se/thenmap/?map=africa&amp;fYear=1948&amp;sYear=1948">African map</a>.
	<li><a href="http://www.thenmap.net?map=world-mollweide">A different projection</a>
	<li>A dataset: <a href="http://www.thenmap.net?map=europe&amp;fYear=2001&amp;lYear=2012&amp;dataCss=unemployment-eu">Unemployment in EU during one decade</a>
	</ul>
	<p><a href="https://trello.com/b/aqFu3s1d/thenmap">Report bugs here</a></p>
	<p>Work in progress by <a href="http://leowallentin.se">Leo Wallentin</a> and Jens Finnäs, J++.<p>
	</article>
		<script src=//cdnjs.cloudflare.com/ajax/libs/qtip2/2.1.1/basic/jquery.qtip.min.js></script>
		<script src=//cdnjs.cloudflare.com/ajax/libs/jquery.imagesloaded/3.0.4/jquery.imagesloaded.min.js></script>
		<script src="thnmp.js?map=<?php echo $map->get(); ?>&amp;dataCss=<?php echo $dataCss->get(); ?>&amp;fYear=<?php echo $firstYear->get(); ?>&amp;sYear=<?php echo $startingYear->get(); ?>&amp;lYear=<?php echo $lastYear->get(); ?>&amp;controls=true&amp;mlang=<?php echo $mapLanguage->get(); ?>&amp;unCache9"></script>
	</body>
</html>
