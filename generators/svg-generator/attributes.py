######################################
# Put world map in full zoom in QGIS #
# Export as svg til infile.svg       #
######################################

#To parse svg
import xml.etree.ElementTree as ET
#To parse dbf
import datetime
from mx import DateTime
from dbfpy import dbf

#SETTINGS
language = 'sv' #Used for title elements
infile = 'infile.svg'
outfile = '../../maps/latest.svg'

#Open database
dbfile = dbf.Dbf("../shapes/cshapes.dbf", readOnly=1)

#SVG namespace
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace('',SVG_NS)

#get xml frp, svg
tree = ET.parse('infile.svg')
root = tree.getroot()

#Set document size
#root.set("viewBox", "0 0 1715.26 720.63")
root.set("viewBox", "0 0 957.25188 369.25188")

# svg > g > g > g
for shapeLayer in root.findall('{%s}g' % SVG_NS):

	#remove red outline
	if (shapeLayer.get("id") == "qgisviewbox"):
		root.remove(shapeLayer)

	#move everything into the right postition
	if (shapeLayer.get("id") == "cshapes"):
		shapeLayer.set("transform","translate(-22.874058,-116.87406)")

	#set shape and fill
	for shapeGroup in shapeLayer.findall('{%s}g' % SVG_NS):
		shapeGroup.set("stroke","rgb(255,255,255)")
		shapeGroup.set("stroke-width",".5")
		
		#Iterate though countries 
		i = 0
		for g in shapeGroup.findall('{%s}g' % SVG_NS):
			# Our svg will be created directly off the db structure, so everything should be in the same order, i.e. first group in svg should correspond to first row in db	
			dbdata = dbfile[i]
			
			#Check id just in case
			if not ( str(i+1) in g.get('id') ):
				print "WARNING: Svg does not seem to correspond with db. Check countries carefully!"
#			g.set('data-name',dbdata["CNTRY_NAME"]);
			g.set('data-start',str(dbdata["JSDATE"]));
			g.set('data-end',str(dbdata["JEDATE"]));
			
			#Add country name as a title
			# TODO use current language! Either from column, or wikidata id.
			title = ET.SubElement(g,'title')
			title.text = dbdata["CNTRY_NAME"]

			i += 1

dbfile.close()

tree.write(outfile,encoding="utf-8",xml_declaration=True); 
