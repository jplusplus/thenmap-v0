# coding=utf-8

# Will take WikiData ID's from Thenmaps dbf file, and update our local repository
# Use settings.py to add properties
# These will be used to generate json files for each map

import settings
import wikitools

from dbfpy import dbf

import os #Getting filepaths
import json
import re
import time
import dateutil.parser

####################################################
# CLASSES AND FUNCTIONS
#####################################################

class Qid:
	""" Store a Wikidata id (eg "Q1234") """
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

class Id:
	""" Store a path or nation id (eg "124") """
	iid = ''
	def __init__(self, code):
		self.iid = str(int(round(float(code))))
	def get(self):
		return self.iid

def getDateFromWD(value):
	""" Convert a Wikidata date item to an ISO date string """
	t =  value["time"]
	tobj = dateutil.parser.parse( t[8:] )
	return tobj.date().isoformat()

def getLabelsFromEntity(e):
	""" Extract labels (translations) from a WikiData entity """
	names = {}
	if "labels" in e:
		for l in settings.languages:
			if l in e["labels"]:
				names[l] = e["labels"][l]["value"]
			else:
				names[l] = ''
	else:
		for l in settings.languages:
			names[l] = ''
	return names

def getStartDate(val):
	""" Extracts start date from WD entity as YYYY-MM-DD """
	date = ''
	if "P580" in val["qualifiers"]:
		if "datavalue" in val["qualifiers"]["P580"][0]:
			date = getDateFromWD(val["qualifiers"]["P580"][0]["datavalue"]["value"])
	return date

def getEndDate(val):
	""" Extracts start end from WD entity as YYYY-MM-DD """
	date = ''
	if "P582" in val["qualifiers"]:
		if "datavalue" in val["qualifiers"]["P582"][0]:
			date = getDateFromWD(val["qualifiers"]["P582"][0]["datavalue"]["value"])
	return date

###########################################################################################################################
###########################################################################################################################
# START PROGRAM ###########################################################################################################
###########################################################################################################################
###########################################################################################################################

nations = {}
properties = {}
files = {}

#Read dbf file, we will use this data a lot through out the process
currentPath = os.path.dirname(os.path.realpath(__file__))
dbffile     = currentPath + '/../shapes/thenshapes.dbf'

print "Reading dbf file...",
db = dbf.Dbf(dbffile)
print "done"

print "collecting data from dbf file"
#Store the wikidata codes we want to get data from
wikidataCodes = set()

#Loop through nations
for rec in db:

	#-1 means that no entry existed the last time we checked
	#0 probably means that we haven't checked if there is an entry yet
	if (rec["WIKIDATA"] > 0):
		qid = Qid(rec["WIKIDATA"])
		wikidataCodes.add(qid.get())

print "Found %d wikidata codes" % len(wikidataCodes)

# Set up WikiData
print "Connecting to WikiData"
site = wikitools.Wiki("http://www.wikidata.org/w/api.php", settings.login.user, settings.login.password)
site.login(settings.login.user,settings.login.password)
print "Logged in?",
print site.isLoggedIn()
if site.isLoggedIn():
	chunkSize = 48
else:
	#WikiData allows only 49 id's at a time for anonymous users (docs say 50). Split our array 
	chunkSize = 48

#Store qid's for second round of label lookups
secondLookup = {}
for pkey,pid in settings.entityProperties.items():
	secondLookup[pkey] = set()

#Store image names
imagesFound = {}
for pkey,pid in settings.imageProperties.items():
	imagesFound[pkey] = set()
	
languagesQueryString = '|'.join(settings.languages)

#Chunk list
wikidataCodes = list(wikidataCodes)
chunks=[wikidataCodes[x:x+chunkSize] for x in xrange(0, len(wikidataCodes), chunkSize)]
#Fetch data
for c in chunks:
	print ("Getting %d items from Wikidata..." % len(c))

	cQueryString = '|'.join(c)
	params = {'action':'wbgetentities', 'languages':languagesQueryString, 'props':'labels|claims','ids':cQueryString,'format':'json'}
	request = wikitools.APIRequest(site, params)
	result = request.query()

	if "entities" in result:
		for qid,e in result["entities"].items():
			nation = {}

			# Look for translations (labels)
			nation["names"] = getLabelsFromEntity(e)

			#Lookfor properties
			if "claims" in e:

				# Look for entity properties
				# These will be pointers to other WD enteties, from which we will get the names later 
				for pkey,pid in settings.entityProperties.items():
					if pid in e["claims"]:
						vals = e["claims"][pid]
						outPropList = []
						for val in vals:
							if val["mainsnak"]["snaktype"] == "value":
								outPropVal = {}

								if val["mainsnak"]["datavalue"]["type"] == "wikibase-entityid":
									q = Qid(val["mainsnak"]["datavalue"]["value"]["numeric-id"])
									secondLookup[pkey].add(q.get())
									outPropVal["qid"] = q.get()
																		
								if "qualifiers" in val:
									outPropVal["start"] = getStartDate(val)
									outPropVal["end"]   = getEndDate(val)

							
								outPropList.append(outPropVal)

						nation[pkey] = outPropList

				# Look for image properties
				# These will be text strings
				for pkey,pid in settings.imageProperties.items():
					if pid in e["claims"]:
						vals = e["claims"][pid]
						outPropList = []
						for val in vals:						
							if val["mainsnak"]["snaktype"] == "value":
								outPropVal = {}

								if val["mainsnak"]["datavalue"]["type"] == "string":
									outPropVal["file"] = val["mainsnak"]["datavalue"]["value"]
									imagesFound[pkey].add(val["mainsnak"]["datavalue"]["value"])
																		
								if "qualifiers" in val:
									outPropVal["start"] = getStartDate(val)
									outPropVal["end"]   = getEndDate(val)
							
								outPropList.append(outPropVal)
								
							nation[pkey] = outPropList

			nations[qid] = nation

print "Writing data/nations.json...",
with open("data/nations.json", 'w') as outfile:
	json.dump(nations, outfile)
print "done"

# Second loop: Get names of entities (e.g. capitals)
for pkey, qids in secondLookup.items():

	print "Looking up %s" % pkey
	properties[pkey] = {}
	
	qidlist = list(qids)
	chunks=[qidlist[x:x+chunkSize] for x in xrange(0, len(qidlist), chunkSize)]

	for c in chunks:
		print "getting %d entities" % len(c)
		queryString = '|'.join(c)
		#	print queryString
		params = {'action':'wbgetentities', 'languages':languagesQueryString, 'props':'labels','ids':queryString,'format':'json'}
		request = wikitools.APIRequest(site, params)
		result = request.query()

		if "entities" in result:
			for qid,e in result["entities"].items():
				names = getLabelsFromEntity(e)
				properties[pkey][qid] = names

print "Writing property files...",
for key,pid in settings.entityProperties.items():
	with open("data/"+key+".json", 'w') as outfile:
		json.dump(properties[key], outfile)
	print "done"

#Get path fragments for each flag
print "Connecting to Wikimedia Commons..."
site = wikitools.Wiki("http://commons.wikimedia.org/w/api.php", settings.login.user, settings.login.password)
site.login(settings.login.user,settings.login.password)
print "Logged in?",
print site.isLoggedIn()

if site.isLoggedIn():
	chunkSize = 48
else:
	chunkSize = 48

for pid, imgset in imagesFound.items():

	print "Looking up %s images" % pid
	
	imglist = list(imgset)
	chunks=[imglist[x:x+chunkSize] for x in xrange(0, len(imglist), chunkSize)]
	for c in chunks:
		print "getting %d entities" % len(c)
		queryString = 'File:' + '|File:'.join(c)
		#	print queryString
		#We need to ask for a thumbnail (of any size) to know if the thumbs should have a suffix (eg .png for .svg files)
		params = {'action':'query', 'titles': queryString, 'prop':'imageinfo','iiurlparam':'','iiprop':'url','format':'json','iiurlwidth':'80'}
		request = wikitools.APIRequest(site, params)
		result = request.query()
		
		for key,page in result["query"]["pages"].iteritems():
			if "missing" in page:
				pass
			else:
				if "imageinfo" in page:
					urlinfo = {}
					url = page["imageinfo"][0]["thumburl"]
					m = re.compile('\/([a-f0-9]{1,2}\/[a-f0-9]{1,2})\/.*?(\.[a-zA-Z]{3,4})?(\.[a-zA-Z]{3,4})?$')
					r = m.search(url)
					urlinfo["filename"] = page["title"]
					urlinfo["infix"] = r.group(1)
					if r.group(3) is not None:
						urlinfo["suffix"] = r.group(3)
					files[page["title"]] = urlinfo
print "Writing data/files.json...",
with open("data/files.json", 'w') as outfile:
	json.dump(files, outfile)
print "done"

print "All done!"
