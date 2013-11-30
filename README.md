thenmap
=======
Post war political world map

* 1946 -- 2013 is acceptable but not perfect
* 1940 -- 1946 is missing a lot of data, but could be fixed
* 1920 -- 1945 will require more work, as a lot of shapes need to be created from scratch
*      -- 1920 will require _a lot_ of research

Script to generate svg maps is in generators/map-factory

Example with dataset: [Unemployment in EU](http://www.leowallentin.se/thenmap/?map=europe&fYear=2001&lYear=2012&dataCss=unemployment-eu)

Available map languages: sv,en,fi,fr,de,es,ru,it,nl,pl,zh,pt,ar,ja,fa,no,he,tr,da,uk,ca,id,hu,vi,ko,et,cs,hi,sr,bg

The easiest way to implement thenmap is by creating a <div> or <section> element with the id "thenmap", and then include the following piece of code:
<script src="//thenmap.net/thenmap.js"></script>
Nations are now colored with css classes. The css can also be hosted, like here (decolonization of the world):
http://www.leowallentin.se/thenmap/demo2.html

And here is the unemployment in European nations, year by year (using customized styles):
http://www.leowallentin.se/thenmap/demo.html

You can also build your own, custom controls for the map, like in this map showing countries taking part in the Eurovision Song Contest since the start:
http://www.leowallentin.se/thenmap/demo.html

Five maps are currently avaiable, but more maps can easily be rendered. (A python script renders all maps automatically):
 * The world, Robinson projection:  http://www.leowallentin.se/thenmap?map=world-robinson
 * The world, Mollweide projection: http://www.leowallentin.se/thenmap/?map=world-mollweide
 * Europe, orthographic projection: http://www.leowallentin.se/thenmap/?map=europe-ortho
 * Europe, incl. Caucasus, Lambert conformal conic: http://www.leowallentin.se/thenmap/?map=europe-caucasus-lcc
 * Africa, Lambert Azimuthal Equal-Area Projection: http://www.leowallentin.se/thenmap/?map=africa-laea (oh yes, there is a border error there)

Nation names are translated into 30 languages, thanks to the WikiData project. Swedish and English should be fully covered. English is used as a fallback language, when no translation is available. A better approach should be implemented.
 * Europe in French: http://www.leowallentin.se/thenmap/?map=europe&mlang=fr
 * The World in Hindi: http://www.leowallentin.se/thenmap/?map=world&mlang=hi
The languages are: sv,en,fi,fr,de,es,ru,it,nl,pl,zh,pt,ar,ja,fa,no,he,tr,da,uk,ca,id,hu,vi,ko,et,cs,hi,sr, and bg

All parameters to the script:
controls=true/false (Show control buttons below the player? Default true)
autoinit=true/false (Initiate the map automatically? Will also load JQuery if not already loaded. Default true)
mlang=LANGUAGE CODE (Map map language. Default: sv = Swedish. See the list above)
lang=LANGUAGE CODE (interface language. Default: sv)
fYear=YEAR (First year. Default 1946. Map is incomplete before 1946)
lYear=YEAR (Last year. Default 2013. Current borders, names and flags will be used after 2014)
sYear=YEAR (What year should be displayed on page load?)
offset=mm-dd (Show borders and nations from this date of the year. Default: 07-01. If browsing by month -- not yet implemented -- this would be date day of the month.)
dataCss=XXXX (Name of hosted data set. Default: none)
debug=true/false (Default false)
