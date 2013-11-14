from kartograph import Kartograph
import os #Getting filepaths
import xml.etree.ElementTree as ET #To parse svg
import urllib2 #WikiData
import json
import csv
from dbfpy import dbf


##########################################
#          SETTINGS                      #
languages   = ["sv","en","fi","fr","de","es","ru","it","nl","pl","zh","pt","ar","ja","fa","no","he","tr","da","uk","ca","id","hu","vi","ko","et","cs","hi","sr","bg"] #
mapType     = "europe-ortho"             #
#mapType     = "world-mollweide"          #
#mapType     = "world-robinson"           #
startDate   = "1945-01-01"               #
endDate     = "2013-12-31"               #
##########################################

mapSettings = {
	"world-robinson": {
		"proj": {
			"id": "robinson",
			"lon0": 20,
		},
		"simplify":  0.4
	},
	"world-mollweide": {
		"proj": {
			"id": "mollweide",
			"lon0": 20,
		},
		"simplify":  0.4
	},
	"world-gallpeters": {
		"proj": {
			"id": "gallpeters",
			"lon0": 20,
		},
		"simplify":  0.2
	},
	"europe-ortho": {
		"proj": {
			"id": "ortho",
			"lon0": 17,
			"lat0": 60,
		},
		"bounds": {
			"mode": "points",
			"data": [[-43,65],[34,34]]
		},
	},
}

#paths
currentPath = os.path.dirname(os.path.realpath(__file__))
outputDirectory       = currentPath+'/../../maps'
translationsDirectory = currentPath+'/../../lang'

#directories
shapesfile  = currentPath + '/../shapes/thenshapes.shp'
dbffile     = currentPath + '/../shapes/thenshapes.dbf'

#temp file
fileAfterKartograph  = currentPath + '/temp/' + mapType + '.svg'
#output files
svgFileName = outputDirectory + "/" + mapType + ".svg"

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
    "charset"  : "utf-8",
	"attributes": {
		"class"   : "CLASSES",
		"start"   : "JSDATESTR",
		"end"     : "JEDATESTR",
		"id"      : "ID",
	},
},{
	"id"		: "background",
	"special"	: "sea",
}]

#Add simplification settings to nation layer in config.layers
if "simplify" in mapSettings[mapType]:
	config["layers"][0]["simplify"] = mapSettings[mapType]["simplify"]

#Chose size by height
config["export"] = {
	"round": 1,
	"height": 768,
}

####################################################33
# CLASSES
#####################################################
class Qid:
	qid = ''
	def __init__(self, code):
		if isinstance(code, str):
			if 'Q' == code[0]:
				self.qid = code
			else:
				self.qid = "Q"+code
		else:
			self.qid = "Q" + str(int(round(float(code))))
	def get(self):
		return self.qid

###############################################################################################################################
###############################################################################################################################
# START PROGRAM ###############################################################################################################
###############################################################################################################################
###############################################################################################################################


print ("Will try to create a %s map. This can take a very long time. Turn off all compressing during development." % mapType)

K = Kartograph()
K.generate(config, outfile=fileAfterKartograph)

print ("Map created as %s" % fileAfterKartograph)

###############################################################################################################################
###############################################################################################################################

#Now, lets clean up the svg a bit, add classes to nation, etc

#Register SVG namespace
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace('',SVG_NS)

#get xml from svg
print ("Loading map for extra processing..."),
tree = ET.parse(fileAfterKartograph)
root = tree.getroot()

print ("done")

#Remove styling
print "Removing styling",
del root.attrib["style"];
print "done"

#Define diagonal hatch pattern
#<pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45 2 2)">
#	<path d="M -1,2 l 6,0" stroke="#000000" stroke-width="1"/>
#</pattern>
print "Add hatch pattern",
defs = root.find("{%s}defs" % SVG_NS)
pattern = ET.SubElement(defs,"{%s}pattern" % SVG_NS)
pattern.set("id","diagonalHatch")
pattern.set("patternUnits","userSpaceOnUse")
pattern.set("width","4")
pattern.set("height","4")
pattern.set("patternTransform","rotate(45 2 2)")
path = ET.SubElement(pattern,"{%s}path" % SVG_NS)
path.set("d","M -1,2 l 6,0")
path.set("stroke","#888888")
path.set("stroke-width","1")
print "done"

#Find and move the background to the top, so that all browsers can "see" the nations layer
print "Moving background layer to the top, for browser compatibility...",
background = root.find("{%s}g[@id='background']" % SVG_NS)
root.remove(background)
root.insert(2,background)
print "done"

#Find the nations
nations = root.find("{%s}g[@id='nations']" % SVG_NS)

for nation in nations.findall('{%s}path' % SVG_NS):
	#set classes
	classes = str(nation.get("data-class"))
	nation.set("class",classes+" land")
	#make id valid and data-id an integer
	rawid = nation.get("data-id");
	if rawid:
		iid = str(int(round(float(nation.get("data-id")))))
		nation.set("id","n"+iid)
		nation.set("data-id",iid)
	else:
		print "found nation with missing id, check your shapes! Classes: %s" % classes
	#Remove attributes to save a few bytes
	del nation.attrib["data-class"]

tree.write(svgFileName,encoding="utf-8",xml_declaration=True);
print("Wrote %s" % svgFileName)

###############################################################################################################################
###############################################################################################################################

# Create json strings with data for popups, etc
# Sources: Wikidata, local translations, fallback names from dbf

#One list of id: names  for each language
nationNames = {}
for l in languages:
	nationNames[l] = {}

#One list of id: {flagthumb, flaglink}
nationFlags = {}

#Collect all wikidata codes
wikidataCodes = set()
wikidataFlags = {}
wikidataNames = {}
for l in languages:
	wikidataNames[l] = {}

print "Reading dbf file...",
db = dbf.Dbf(dbffile)
print "done"

for rec in db:
	if (rec["WIKIDATA"] > 0):
		qid = Qid(rec["WIKIDATA"])
	wikidataCodes.add(qid.get())

print "Found %d wikidata codes" % len(wikidataCodes)

#WikiData allows only 50 id's at a time for anonymous users. Split our array 
wikidataCodes = list(wikidataCodes)
chunks=[wikidataCodes[x:x+45] for x in xrange(0, len(wikidataCodes), 45)]
#Fetch datas
for c in chunks:
	print ("Getting %d items from Wikidata..." % len(c))
	cQueryString = '|'.join(c)
	languagesQueryString = '|'.join(languages)
	url = "http://www.wikidata.org/w/api.php?action=wbgetentities&languages="+languagesQueryString+"&props=labels|claims&ids="+cQueryString+"&format=json"
	response = urllib2.urlopen(url)
	data = json.load(response)
	
	#Get all nation names in all languages
	for l in languages:
		if "entities" in data:
			for i,e in data["entities"].items():
				#Look for translation
				if "labels" in e:
					if l in e["labels"]:
						wikidataNames[l][i] = e["labels"][l]["value"]

		#Get all nation flags
			for i,e in data["entities"].items():
				if "claims" in e:
					if "P41" in e["claims"]:
						flag = e["claims"]["P41"][0]["mainsnak"]["datavalue"]["value"]
#https://toolserver.org/~magnus/commonsapi.php?image=Test.png|Test2.png&thumbwidth=80px
						wikidataFlags[i] = flag
print "done"

#Create entries in our own lists for each nation

#Nation names for each language
for l in languages:
	#Open file with local translation, if it exists, for fallback
	#Format:
	# internalNationName, translation
	localTranslations = {}
	try:
		with open(translationsDirectory+'/'+l+'/nations.csv', 'rb') as csvfile:
			reader = csv.reader(csvfile)
			for row in reader:
				localTranslations[row[0]] = row[1]
	except IOError:
	    print ("No local translations for %s" % l)

	for rec in db:
		internalId = int(round(rec["ID"]))
		wikidataId = Qid(rec["WIKIDATA"])
		internalNationName = rec["CNTRY_NAME"]
		nationTitle = ''

		#Use Wikidata name, if available
		if (wikidataId.get() in wikidataNames[l]):
			nationTitle = wikidataNames[l][wikidataId.get()]
		#Else use local translation, if available
		elif (internalNationName in localTranslations):
			nationTitle = localTranslations[internalNationName]
		#Else use internal name
		else:
			nationTitle = internalNationName
			print("Nation not found in WikiData or local translations. Defaulting to %s for %s" % (nationTitle,internalId))

		nationNames[l][internalId] = nationTitle;

print ("Writing nation title files for %d languages..." % len(languages)),
for l in languages:
	languageFileName = outputDirectory + "/" + mapType + "-" + l + ".json"
	with open(languageFileName, 'w') as outfile:
		json.dump(nationNames[l], outfile)
print "done"

for i, flag in wikidataFlags
	print wikidataFlags[i] = {flag, "HEJ HEJ"}

#Flags for each nation
for rec in db:
	internalId = int(round(rec["ID"]))
	wikidataId = Qid(rec["WIKIDATA"])
	if (wikidataId.get() in wikidataFlags):
		nationFlag = wikidataFlags[wikidataId.get()]
		nationFlags[internalId] = nationFlag

print ("Writing flags file"),
flagsFileName = outputDirectory + "/" + mapType + "-flags.json"
with open(flagsFileName, 'w') as outfile:
	json.dump(nationFlags, outfile)
print "done"


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
			
