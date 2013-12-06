thenmap
=======
Post war political world map

* 1946 -- 2013 is acceptable but not perfect
* 1940 -- 1946 is missing a lot of data, but could be fixed
* 1920 -- 1945 will require more work, as a lot of shapes need to be created from scratch
*      -- 1920 will require _a lot_ of research

The code is not even a beta, so use at you own risk. Feel free to report any bugs in [the Trello board](https://trello.com/b/aqFu3s1d/thenmap)


Example with dataset: [Unemployment in EU](http://www.leowallentin.se/thenmap/?map=europe&fYear=2001&lYear=2012&dataCss=unemployment-eu)

Available map languages: sv,en,fi,fr,de,es,ru,it,nl,pl,zh,pt,ar,ja,fa,no,he,tr,da,uk,ca,id,hu,vi,ko,et,cs,hi,sr,bg

Script to generate svg maps is in generators/map-factory

How to use
----------

The easiest way to implement thenmap is by creating a `<div>` or `<section>` element with the id "thenmap", and then include the following piece of code:

    <script src="//thenmap.net/thenmap.js"></script>

Nations are now colored with css classes. The css can also be hosted, like here (decolonization of the world):
http://www.leowallentin.se/thenmap/demo2.html

And here is the unemployment in European nations, year by year (using customized styles):
http://www.leowallentin.se/thenmap/demo.html

You can also build your own, custom controls for the map, like in this map showing countries taking part in the Eurovision Song Contest since the start:
http://www.leowallentin.se/thenmap/demo.html

For more control over the script, see alternative usage method below

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
 * controls=true/false (Show control buttons below the player? Default true)
 * autoinit=true/false (Initiate the map automatically? Will also load JQuery if not already loaded. Default true)
 * mlang=LANGUAGE CODE (Map map language. Default: sv = Swedish. See the list above)
 * lang=LANGUAGE CODE (interface language. Default: sv)
 * fYear=YEAR (First year. Default 1946. Map is incomplete before 1946)
 * lYear=YEAR (Last year. Default 2013. Current borders, names and flags will be used after 2014)
 * sYear=YEAR (What year should be displayed on page load?)
 * offset=mm-dd (Show borders and nations from this date of the year. Default: 07-01. If browsing by month -- not yet implemented -- this would be date day of the month.)
 * dataCss=XXXX (Name of hosted data set. Default: none)
 * debug=true/false (Default false)
 
If autoinit is not used, the script is loaded like this:

    var mymap = Thenmap.init(element,callback);

callback is the function to call everytime the map updates, element is the html element to attach the map to.

Avaiable methods are:
 * Thenmap.init(e,cb)
 * Thenmap.moveRight()
 * Thenmap.moveLeft()
 * Thenmap.togglePlayPause()
 * Thenmap.moveToStart()
 * Thenmap.moveToEnd()
 * Thenmap.playTimeline()
 * Thenmap.stopTimeline()

Values: 
 * Thenmap.currentYear
 * Thenmap.isPlaying (true/false)
 * Thenmap.svg (the map svg element)

WikiData integration
--------------------
The map has tooltip windows for each nation, that can contain additional data. By default the nation's name and flag is displayed. Flags and names are fetched from WikiData when the maps are created. Basically every nation that has a Wikipedia article in _any_ language also has a WikiData entry. When WikiData entries are missing (yes, there are actually a few such examples!), we go there to create one. The advantages of using WikiData are plenty:
 * Translations to all languages with major Wikipedia editions, using the <a href="https://en.wikipedia.org/wiki/Principle_of_least_astonishment">principle of least astonishment</a>. This works very well for us, as these are the names that are most likely used in mainstream media. When names are missing, or we are unhappy about the name forms, we can override them with local translations.
 * We get additional data, such as flags, relatively well referenced with sources.
 * We can use images from Wikimedia Commons.
 * The nation data is kept up to date by a huge community.
 * All data is CC0
 * As each nation has a WikiData ID, more data (e.g. Wikipedia link) can easily be requested
On the flipside:
 * Flags (the actual images from WikiMedia Commons, not the WikiData entry) can sometimes have more restrictive licenses. We should probably add an option to filter out CC0 and public domain images only.
 * We can only be as granular as WikiData. We will, in other words, not be able to display every flag, capital, etc, unless we create a local repository for such data

Roadmap
-------
Coming next
* Support for older Internet Explorer versions (<= IE8), by serving vml files to those browsers
* Lot's of bug fixes (e.g. hash pattern for disputed territories looking weird in many browsers)
* Some territorial fixes
* Better looking control panel
* Better performance (it's currently quite sluggish in old smart phones)
Coming later:
* Border going back to 1920
* More accurate flags and nation titles
* More maps and projections
* Shorter loading times
* functions for plotting data on the map (other than just coloring it)

Credits, copyright and licensing
--------------------------------
Thenmap is Copyright © 2013 [Leo Wallentin](http://leowallentin.se) and Jens Finnäs, and free to reuse, modify and distribute under the [MIT license](http://opensource.org/licenses/MIT) (see below).

JS minification is done with [JShrink](https://github.com/tedivm/JShrink), copyright © 2009 by Robert Hafner.

The slider uses a [patched](https://code.google.com/p/dragdealer/issues/list?q=type=Patch) and stripped down version of [Dragdealer JS v0.9.5](http://code.ovidiu.ch/dragdealer-js), copyright © 2010 by Ovidiu Chereches, and released under the [MIT License](http://legal.ovidiu.ch/licenses/MIT).

Dynamic CSS and JS loading is handled by [LazyLoad](https://github.com/rgrove/lazyload/), copyright © 2011 by Ryan Grove <ryan@wonko.com>

Internationalization by [Light-i18n](https://github.com/ahfeel/php-light-i18n) by Jérémie Bordier

Nation names are provided by tens of thousand of Wikipedia editors, thanks to the [WikiData project](https://www.wikidata.org) and community, [CC-0](http://creativecommons.org/publicdomain/zero/1.0/), when no local translation is available.

Maps are prerendered  with [Kartograph.py](https://github.com/kartograph/kartograph.py), licensed under [AGPL](http://www.gnu.org/licenses/agpl-3.0.txt), by Gregor Aisch

Shapefiles are primarily based on [Natural Earth](http://www.naturalearthdata.com/about/), but also borrowing from [DIVA-GIS free spatial data](http://www.diva-gis.org/Data) and [CSHAPES](http://nils.weidmann.ws/projects/cshapes), Weidmann, Nils B., Doreen Kuse, and Kristian Skrede Gleditsch. 2010. [The Geography of the International System: The CShapes Dataset. International Interactions 36 (1)](http://www.tandfonline.com/doi/abs/10.1080/03050620903554614#.UqAvJrXtkWM), especially after 1975. Hyderabad borders are from [sharemap.org](http://sharemap.org/public/Hyderabad) by anonymous users, [CC-BY-SA 3.0](http://creativecommons.org/licenses/by-sa/3.0/). Countless old, public domain maps have been used to recreate old borders when needed. We would appreciate a line of credit if you find them useful and reuse them!

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
