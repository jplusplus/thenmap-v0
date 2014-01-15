# coding=utf-8

#Converts a csv contining country codes and numerical values, to json
#Years should be given in the header, like this:
#
# land, 1980, 1981, 1982
#   se,   12,   13,   11
#   fi     7,   10,   14

import csv
import json
import argparse
import os.path
import sys
import math

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
        
def doRounding(s):
	return str(round(float(s)))[:-2]


#Check if values are years
def isYear(s):
	try:
		float(s)
		if 4 is len(s):
			return True
		else:
			return False
	except ValueError:
		return False

#Define command line arguments
parser = argparse.ArgumentParser(description='Converts a csv contining country codes and numerical values, to json.')

#Input file
parser.add_argument("-i", "--input", dest="infile", required=True,
    help="input file", metavar="FILE",
    type=lambda x: is_valid_file(parser,x))

#Output file
parser.add_argument("-o", "--output", dest="outfile",
    help="output file", metavar="FILE")

#Column
parser.add_argument("-c", "--column", dest="column",
    help="column containing nation codes. The first column is “0”", type=int, default=0)

#Rounding
parser.add_argument("-d", "--decimals", dest="decimals",
    help="Number of decimals to keep. Default is -1, meaning “keep all”", type=int, default=-1)
    
args = parser.parse_args()

inputFile = args.infile #"/home/leo/Världen/demo/patents/raw-pre.csv"

if args.outfile is None:
	outputFile = os.path.splitext(inputFile)[0] + ".json"
	print "No output file given, using %s" % outputFile
else:
	outputFile = args.outfile


if os.path.isfile(outputFile):
	print "File %s already exists. Overwrite? [y/N]" % outputFile
	choice = raw_input().lower()
	if not choice in ('y', 'yes'):
		sys.exit()
	
indataColumn = args.column
print indataColumn

outdata = {}
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
				currentNation = row[indataColumn]
				outdata[currentNation] = []
				i = 0
				for col in row:
					currentHeader = headers[i]
					if isYear(currentHeader):
						if is_number(col):
							if (args.decimals > -1):
								outdata[currentNation].append(doRounding(col))
							else:
								outdata[currentNation].append(col)
						else:
							outdata[currentNation].append('')
					i += 1
    
except IOError:
    print ("Could not open input file")
    
print "Writing %s..." % outputFile
with open(outputFile, 'w') as outfile:
	json.dump(outdata, outfile)
print "done"
