from kartograph import Kartograph
import os #Getting filepaths
import xml.etree.ElementTree as ET #To parse svg
import urllib2 #WikiData
import urllib #Toolserver
import json
import csv
from dbfpy import dbf
#URI-encoding
import re, urlparse

##########################################
#          SETTINGS                      #
languages   = ["sv","en","fi","fr","de","es","ru","it","nl","pl","zh","pt","ar","ja","fa","no","he","tr","da","uk","ca","id","hu","vi","ko","et","cs","hi","sr","bg"] #
mapType     = "europe-ortho"             #
mapType     = "world-mollweide"          #
#mapType     = "world-robinson"           #
#mapType     = "africa-laea"              #  
mapType     = "europe-caucasus-lcc"      #
startDate   = "1945-01-01"               #
endDate     = "2013-12-31"               #
##########################################

mapSettings = {
	# Default projection for world maps
	"world-robinson": {
		"proj": {
			"id": "robinson",
			"lon0": 20,
		},
		"simplify":  0.6,
		"circles":   3000
	},
	# Alternative projection for world maps
	"world-mollweide": {
		"proj": {
			"id": "mollweide",
			"lon0": 20,
		},
		"simplify":  0.6,
		"circles":   3000
	},
	# In case someone wants an equal area map
	"world-gallpeters": {
		"proj": {
			"id": "gallpeters",
			"lon0": 20,
		},
		"simplify":  0.2,
		"circles":   3000
	},
	# Europe, not including Caucasus or Greenland
	"europe-ortho": {
		"proj": {
			"id": "ortho",
			"lon0": 13,
			"lat0": 47,
		},
		"bounds": {
#			"mode": "points",
#			"data": [[-43,65],[34,33]]
			"mode": "bbox",
			"data": [-15,34,35,71]
		},
		"simplify":  0.2,
		"circles":   1000
	},
	# Europe, including Caucasus and Greenland. Lambert Conformal Conic
	"europe-caucasus-lcc": {
		"proj": {
			"id": "lcc",
			"lon0": 20,
			"lat0": 40,
			"lat1": 30,
			"lat2": 50
		},
		"bounds": {
#			"mode": "points",
#			"data": [[-43,65],[34,33]]
			"mode": "bbox",
			"data": [-12,30,52,75]
		},
		"simplify":  0.2,
		"circles":   1500
	},
	# Africa
	"africa-laea": {
		"proj": {
			"id": "laea",
			"lon0": 18,
			"lat0": 14,
		},
		"bounds": {
			"mode": "points",
			"data": [[-26,37],[62,-36]]
		},
		"simplify":  0.2,
		"circles":   1000
	},
}

#paths
currentPath = os.path.dirname(os.path.realpath(__file__))
outputDirectory       = currentPath+'/../../maps/'+mapType
translationsDirectory = currentPath+'/../../lang'

#files
shapesfile  = currentPath + '/../shapes/thenshapes.shp'
dbffile     = currentPath + '/../shapes/thenshapes.dbf'

#temp file
fileAfterKartograph  = currentPath + '/temp/' + mapType + '.svg'
#output files
svgFileName = outputDirectory + "/" + mapType + ".svg"
flagsFileName = outputDirectory + "/" + mapType + "-flags.json"

####################################################
# CLASSES AND FUNCTIONS
#####################################################

# Filter for nations to include when generating map
def nationFilter(record):
	#Only include nations within date bounds
	ok = (record['JSDATESTR'] <= endDate) and (record['JEDATESTR'] >= startDate)
	
	#Only include nations of a certain area, if that setting is used
	if "hide" in mapSettings[mapType]:
		ok = ok and (record['AREA'] > mapSettings[mapType]["hide"])

	return ok

#Class for storing Wikidata ids
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

#Uri-encoding
def urlEncodeNonAscii(b):
    return re.sub('[\x80-\xFF]', lambda c: '%%%02x' % ord(c.group(0)), b)

def iriToUri(iri):
    parts= urlparse.urlparse(iri)
    return urlparse.urlunparse(
        part.encode('idna') if parti==1 else urlEncodeNonAscii(part.encode('utf-8'))
        for parti, part in enumerate(parts)
    )

###############################################################################################################################
###############################################################################################################################
# START PROGRAM ###############################################################################################################
###############################################################################################################################
###############################################################################################################################

#Read dbf file, we will use this data a lot through out the process
print "Reading dbf file...",
db = dbf.Dbf(dbffile)
print "done"

## TODO: loop though alla map types when used for production
#Use Kartograph.py to create map
print ("Will try to create a %s map. This can take a very long time. Turn off all compressing during development." % mapType)

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
		"area"    : "AREA",
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

K = Kartograph()
K.generate(config, outfile=fileAfterKartograph)

print ("Map created as %s" % fileAfterKartograph)

###############################################################################################################################

#Now, lets clean up the svg a bit, add classes to nation, group land with circle, etc

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
#Otherwise tooltips will not work in some browsers
print "Moving background layer to the top, for browser compatibility...",
background = root.find("{%s}g[@id='background']" % SVG_NS)
if background is not None:
	root.remove(background)
	root.insert(2,background)
	print "done"
else:
	print "no background layer found"

#Find the nations
nations = root.find("{%s}g[@id='nations']" % SVG_NS)

#We store the id:s of all paths in map, to filter list of flags and nation names
idsInMap = []

#Loop though nations, to store id's, create circles on small nations, and do some cleaning up
print "Processing nations"
for nation in nations.findall('{%s}path' % SVG_NS):
	#get data
	area = nation.get("data-area")
	classes = str(nation.get("data-class"))
	rawid = nation.get("data-id");
	#make sure we have some id, and that it is a string
	if rawid:
		iid = str(int(round(float(nation.get("data-id")))))
	else:
		iid = str("9999")
		print "found nation with missing id, check your shapes! Classes: %s" % classes
	idsInMap.append(iid)
			
	#add circles to small nations
	if 0 < float(area) < mapSettings[mapType]["circles"]:
		print "creating circle for %s, smaller than %d km2" % (iid,mapSettings[mapType]["circles"])
		#create group for path and circle

		#create group, and copy attributes from nation
		g = ET.SubElement(nations,"{%s}g" % SVG_NS)
		g.set("data-start",nation.get("data-start"))
		del nation.attrib["data-start"]
		g.set("data-end",nation.get("data-end"))
		del nation.attrib["data-end"]
		g.set("class","nation")
		g.set("id","n"+iid) #valid html id
		g.set("data-id",iid)

		#Create new path under that group
		path = ET.SubElement(g,"{%s}path" % SVG_NS)
		d = nation.attrib["d"]
		path.set("d",d)
		path.set("class",classes+" land")

		#Create circle under the group
		#Use first point in path to position circle. Very ugly, but works, as nations are so small
		#We do have the coordinates of the capital in the dbf file, if we wanted to do this properly,
		#but then we would have to map them to the proper position for each projection. kartograph.py does not do this
		dlist = re.split('[A-Z]', d)
		pos = dlist[1].split(",")
		circle = ET.SubElement(g,"{%s}circle" % SVG_NS)
		circle.set("cx", pos[0]);
		circle.set("cy", pos[1]);
		circle.set("r",  "8");
		circle.set("class",classes+" circle");

		#remove old path
		nations.remove(nation)

	else:
		#Not a small nation width a circle, don't bother to put the path in a group
		nation.set("id","n"+iid) #valid html id
		nation.set("data-id",iid)
		nation.set("class",classes+" land")
		#Remove attributes to save a few bytes
		del nation.attrib["data-class"]
		del nation.attrib["data-area"]
	
tree.write(svgFileName,encoding="utf-8",xml_declaration=True);
print("Wrote %s" % svgFileName)

###############################################################################################################################

# Create json strings with data for popups, etc
# Sources: Wikidata, local translations, fallback names from dbf

#One list of id: names  for each language
nationNames = {}
for l in languages:
	nationNames[l] = {}

#One list of id: {flagthumb, flaglink}
nationFlags = {}

#Collect all wikidata values at the same time
wikidataCodes = set()
wikidataFlags = {}
wikidataNames = {}
for l in languages:
	wikidataNames[l] = {}

for rec in db:
	#-1 means that no entry existed the last time we checked
	#0 probably means that we haven't checked if there is an entry yet
	if (rec["WIKIDATA"] > 0):
		qid = Qid(rec["WIKIDATA"])
		if str(int(round(float(rec["ID"])))) in idsInMap:
			wikidataCodes.add(qid.get())

print "Found %d wikidata codes" % len(wikidataCodes)

#WikiData allows only 49 id's at a time for anonymous users (docs say 50). Split our array 
wikidataCodes = list(wikidataCodes)
chunks=[wikidataCodes[x:x+48] for x in xrange(0, len(wikidataCodes), 48)]
#Fetch datas
for c in chunks:
	print ("Getting %d items from Wikidata..." % len(c))
	cQueryString = '|'.join(c)
	languagesQueryString = '|'.join(languages)
	url = "http://www.wikidata.org/w/api.php?action=wbgetentities&languages="+languagesQueryString+"&props=labels|claims&ids="+cQueryString+"&format=json"
	req = urllib2.Request(url)
	try:
		response = urllib2.urlopen(req)
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
		if "entities" in data:
			for i,e in data["entities"].items():
				if "claims" in e:
					if "P41" in e["claims"]: #flag image
						flag = e["claims"]["P41"][0]["mainsnak"]["datavalue"]["value"]
						wikidataFlags[i] = flag
					else:
						print ("No flag found for %s" % i)
		print "done"
	except (ValueError,urllib2.URLError) as e:
		print "failed, no internet connection?"
		print e

#Create entries in our own lists for each nation

#Nation names for each language
for l in languages:
	#Open file with local translation, if it exists, for fallback
	#Format:
	# internalNationName, translation
	localTranslations = {}
	try:
		## FIXME remove " around nationnames
		with open(translationsDirectory+'/'+l+'/nations.csv', 'rb') as csvfile:
			reader = csv.reader(csvfile,delimiter=',',quotechar='"')
			for row in reader:
				localTranslations[row[0]] = row[1].strip('" ')
	except IOError:
	    print ("No local translations for %s" % l)

	for rec in db:
		internalId = int(round(rec["ID"]))
		if str(internalId) in idsInMap:
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
				print("Nation name not found in %s , defaulting to %s" % (l,nationTitle))

			nationNames[l][internalId] = nationTitle;

print ("Writing nation title files for %d languages..." % len(languages)),
for l in languages:
	languageFileName = outputDirectory + "/" + mapType + "-" + l + ".json"
	with open(languageFileName, 'w') as outfile:
		json.dump(nationNames[l], outfile)
print "done"

#More info on flag images
print "Getting image paths for %d flags" % len(wikidataFlags)

#create and chunk list of flags
wikidataFlagsList = []
for i,f in wikidataFlags.items():
	wikidataFlagsList.append(f)

chunks=[wikidataFlagsList[x:x+45] for x in xrange(0, len(wikidataFlagsList), 45)]
for c in chunks:
		print "Asking toolserver for %d flags" % len(c)
		cQueryString = '|'.join(c)
		url = "https://toolserver.org/~magnus/commonsapi.php?image="+cQueryString+"&thumbwidth=80px"
		print "Fetching flag data from %s " % url.encode('utf-8')

		response = urllib.urlopen(iriToUri(url))
		tree = ET.parse(response)
		root = tree.getroot()
		
		images = root.findall("image")
		for i in images:
			f = i.find("file")
			if f is not None:
				url = f.find("urls/thumbnail").text
				name = f.find("name").text
				#print "Found thumb url: %s" % url
				if url is not None:
					# For each flag we have to loop though all our nations and our flags, to find it again...
					for rec in db:
						qid = Qid(rec["WIKIDATA"])
						if qid.get() in wikidataFlags:
							if wikidataFlags[qid.get()] == name:
								print "found flag for %s" % rec["CNTRY_NAME"]
								nationFlags[int(round(float(rec["ID"])))] = {"name": name, "url": url}

#Flags for each nation
print ("Writing flags file"),
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
			
