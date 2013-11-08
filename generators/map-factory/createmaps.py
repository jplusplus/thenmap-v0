from kartograph import Kartograph
import os #Getting filepaths
import xml.etree.ElementTree as ET #To parse svg
import urllib2 #WikiData
import json

##########################################
#          SETTINGS                      #
languages   = ["sv","en","fi","fr","de"] #
mapType     = "europe-ortho"             #
#mapType     = "world-robinson"           #
startDate   = "1960-01-01"               #
endDate     = "2013-12-31"               #
##########################################

mapSettings = {
	"world-robinson": {
		"proj": {
			"id": "robinson",
			"lon0": 20,
		},
		"simplify":  0.2
	},
	"world-mollweide": {
		"proj": {
			"id": "mollweide",
			"lon0": 20,
		},
	},
	"world-wagner4": {
		"proj": {
			"id": "wagner4",
			"lon0": 20,
		},
	},
	"europe-ortho": {
		"proj": {
			"id": "ortho",
			"lon0": 17,
			"lat0": 60,
		},
		"bounds": {
			"mode": "points",
			"data": [[-43,63.5],[31.2,35.3]]
		},
	},
}

currentPath = os.path.dirname(os.path.realpath(__file__))
shapesfile=currentPath + '/../shapes/cshapes.shp'
svgFileNameBase = mapType
fileAfterKartograph  = currentPath + '/temp/' + svgFileNameBase + '.svg'
outputDirectory = currentPath+'/../../maps'

# Filter for nations to include
def nationFilter(record):
	return (record['JSDATESTR'] <= endDate) and (record['JEDATESTR'] >= startDate)

#Specific configurations for this map
config = mapSettings[mapType]

#Common configurations for all maps
config["layers"] = [{
	"id"       : "nations",
    "class"    : "nations",
	"src"      : shapesfile,
	"filter"   : nationFilter,
	"attributes": {
		"wikidata": "WIKIDATA",
		"class"   : "CLASSES",
		"name"    : "CNTRY_NAME",
		"start"   : "JSDATESTR",
		"end"     : "JEDATESTR",
	},
}]

#Add simplification settings to first and only layer in config.layers
if "simplify" in mapSettings[mapType]:
	config["layers"][0]["simplify"] = mapSettings[mapType]["simplify"]

#Chose size by height
config["export"] = {
	"round": 1,
	"height": 520
}

print ("Will try to create a %s map. This can take a very long time. Turn off all compressing during development." % mapType)

K = Kartograph()
K.generate(config, outfile=fileAfterKartograph)

print ("Map created")

###############################################################################################################################

#Now, lets add titles, classes, etc

#Register SVG namespace
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace('',SVG_NS)

print ("Loading map for extra processing")

#get xml from svg
tree = ET.parse(fileAfterKartograph)
root = tree.getroot()
#Remove styling
del root.attrib["style"];
nations = root.find("{%s}g[@id='nations']" % SVG_NS)

#Collect all WikiData codes in an array
wikidataCodes = []

for nation in nations.findall('{%s}path' % SVG_NS):
	#add wikidatacode to array
	wikidataNumber = int(round(float(nation.get("data-wikidata"))))
	if ( wikidataNumber > 0):
		qid = "Q"+str(wikidataNumber)
		wikidataCodes.append(qid)

	#set classes
	classes = str(nation.get("data-class"))
	nation.set("class",classes+" land")

#Look up country names in WikiData (returning Wikipedia titles for each country, when available)
newNames = {}
for l in languages:
	newNames[l] = {}

#WikiData allows only 50 id's at a time for anonymous users. Split our array 
chunks=[wikidataCodes[x:x+45] for x in xrange(0, len(wikidataCodes), 45)]
for c in chunks:
	cQueryString = '|'.join(c)
	print "Getting names from Wikidata for %d nations" % len(c)

	languagesQueryString = '|'.join(languages)
	url = "http://www.wikidata.org/w/api.php?action=wbgetentities&languages="+languagesQueryString+"&props=labels&ids="+cQueryString+"&format=json"
	response = urllib2.urlopen(url)
	data = json.load(response)

	for l in languages:
		for i,e in data["entities"].items():
			if "labels" in e:
				if l in e["labels"]:
					newNames[l][i] = e["labels"][l]["value"]
#				else:
#					print("Language %s not found for nation %s" % (l,e))
			else:
				print("No labels in %i, we saw this instead: %s" % (i,e))

for l in languages:
	print ("Applying names in %s" % l)
	for nation in nations.findall('{%s}path' % SVG_NS):
		wikidataNumber = int(round(float(nation.get("data-wikidata"))))
		qid = "Q"+str(wikidataNumber)
		if (qid in newNames[l]):
			nationTitle = newNames[l][qid]
		else:
			nationTitle = str(nation.get("data-name"))
			print("Nation not found. Defaulting to %s for %s" % (nationTitle,qid))
		#Remove any old titles first
		for oldtitle in nation.findall('title'):
			nation.remove(oldtitle)
		#Then set the new one
		t = ET.SubElement(nation,'title')
		t.text = nationTitle

	outputFileName = outputDirectory + "/" + svgFileNameBase + "-" + l + ".svg"
	tree.write(outputFileName,encoding="utf-8",xml_declaration=True);
	print("Wrote %s" % outputFileName)

# Projection best practices from
# http://www.georeference.org/doc/guide_to_selecting_map_projections.htm
#
# Europe:
# Lambert Conformal Conic or Orthographic for Europe.
#
# World
# Robinson or Miller Cylindrical. Robinson seems to be fashionable for thematic maps.
# Any of the pseudocylindrical projections will be fine if you like their appearance better.
# eg wagner4, robinson, mollweide
# Goode homolosine (InterruptedProjection)