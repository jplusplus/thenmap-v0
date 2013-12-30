# coding=utf-8

import csv
import argparse
import os.path
import sys
import brewer2mpl
import pyssed
import jenks

#Check if file exists
def is_valid_file(parser, arg):
    if not os.path.exists(arg):
       parser.error("The file %s does not exist!" % arg)
    else:
       return arg

#Check if values are numbers, for our purposes
def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

# Add fill color to dict
fillColors = {} # save all css rules here
css = {}
def addFillColor(year,land,color):
	if color not in fillColors:
		fillColors[color] = []
	fillColors[color].append(".y{0} .{1} > *".format(year, land))
def addFillColorNoYear(land,color):
	if color not in fillColors:
		fillColors[color] = []
	fillColors[color].append(".{1} > *".format(year, land))
	
################################################################################################333

#Define command line arguments
parser = argparse.ArgumentParser(description='Converts data to color codes, using Jenks natural breaks optimization and ColorBrewer.')

#Input file
parser.add_argument("-i", "--input", dest="infile", required=True,
    help="input file", metavar="FILE",
    type=lambda x: is_valid_file(parser,x))

#Output file
parser.add_argument("-o", "--output", dest="outfile",
    help="output file", metavar="FILE")

#Color scheme
parser.add_argument("-m", "--map", dest="colormap",
    help="Color map, see https://github.com/jiffyclub/brewer2mpl/wiki/Sequential", default='YlOrRd')

args = parser.parse_args()

inputFile = args.infile

if args.outfile is None:
	outputFile = os.path.splitext(inputFile)[0] + ".css"
	print "No output file given, using %s" % outputFile
else:
	outputFile = args.outfile

if os.path.isfile(outputFile):
	print "File %s already exists. Overwrite? [y/N]" % args.outfile
	choice = raw_input().lower()
	if not choice in ('y', 'yes'):
		sys.exit()

numberOfJenksBreaks = 8
colorMap = args.colormap

#####################################################################################

values = []
headers = []
#Open file
try:
	with open(inputFile, 'rb') as csvfile:
		datacsv = csv.reader(csvfile,delimiter=',',quotechar='"')
		firstRow = True
		for row in datacsv:
			if firstRow:
				firstRow = False
				for col in row:
					headers.append(col)
			else:
				for col in row:
					if is_number(col):
						values.append(col)
    
except IOError:
    print ("Could not open input file")

# Calculate breaks    
jenksBreaks = jenks.getJenksBreaks( values, numberOfJenksBreaks )
print "JenkBreaks:",
print jenksBreaks # [0, '0.308', '0.396', '0.489', '0.584', '0.674', '0.755', '0.843', 0.955]

#Loop through all rows and cols and convert any numerical values to a color
bmap = brewer2mpl.get_map(colorMap, 'sequential', numberOfJenksBreaks)
colors = bmap.hex_colors
#bmap.colorbrewer2()

try:
	with open(inputFile, 'rb') as csvfile:
		datacsv = csv.reader(csvfile,delimiter=',',quotechar='"')
		firstRow = True
		for row in datacsv:
			if firstRow:
				firstRow = False
			else:
				#check if all values are the same
				colvals = set()
				for col in row:
					if is_number(col):
						colvals.add(col)
				if len(colvals) == 0:
					pass
				elif len(colvals) == 1:
					addFillColorNoYear(row[0],colvals[0]) # yearland,color
				else:
					c = 0
					for col in row:
						if is_number(col):
							for x in range(0, numberOfJenksBreaks-1):
								if float(col) > float(jenksBreaks[x]):
									code = colors[x]
							addFillColor(headers[c] ,row[0],code) # year,land,color
						c = c +1
						
		#https://pypi.python.org/pypi/colorbrewer

except IOError:
    print ("Could not open input file")
    
for color in fillColors:
	classes = ",".join(fillColors[color])
	css[classes] = { 'fill': color }

# Write to file
try:
	f = open(outputFile, "w")
	try:
		f.write('\n'.join(pyssed.generate(css))) # Write a string to a file
	finally:
		f.close()
except IOError:
	print "Could not write to css file (%s)" % outputFile
