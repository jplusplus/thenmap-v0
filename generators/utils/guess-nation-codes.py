# coding=utf-8

#Try and create nation codes (class names) from nation names in a csv

import csv
import argparse
import os.path
import sys

#Check if file exists
def is_valid_file(parser, arg):
    if not os.path.exists(arg):
       parser.error("The file %s does not exist!" % arg)
    else:
       return arg

#Define command line arguments
parser = argparse.ArgumentParser(description='Try and create Thenmap nation codes (typically two letter iso codes) from nation names in a csv.')

#Input file
parser.add_argument("-i", "--input", dest="infile", required=True,
    help="input file", metavar="FILE",
    type=lambda x: is_valid_file(parser,x))

#Output file
parser.add_argument("-o", "--output", dest="outfile",
    help="output file", metavar="FILE")

#Column
parser.add_argument("-c", "--column", dest="column",
    help="column to search and replace, starting from 0", type=int, default=0)
    
args = parser.parse_args()

inputFile = args.infile #"/home/leo/Världen/demo/patents/raw-pre.csv"

if args.outfile is None:
	print "No output file given. Really overwrite input file? [y/N]"
	choice = raw_input().lower()
	if not choice in ('y', 'yes'):
		sys.exit()
	outputFile = inputFile
else:
	if os.path.isfile(args.outfile):
		print "File %s already exists. Overwrite? [y/N]" % args.outfile
		choice = raw_input().lower()
		if not choice in ('y', 'yes'):
			sys.exit()
	outputFile = args.outfile
	
indataColumn = args.column
outdataColumn = indataColumn

keyDict = {}
try:
	with open('nation-keys.csv', 'rb') as csvfile:
		keyreader = csv.reader(csvfile,delimiter=',',quotechar='"')
		for row in keyreader:
			#Swedish name -> code
			if row[1]:
				keyDict[row[1]] = row[0]
			#English name -> code
			if row[2]:
				keyDict[row[2]] = row[0]
			#Alisases -> code
			if row[3]:
				aliases = row[3].split(",")
				for a in aliases:
					keyDict[a] = row[0]
			#ISO alpha 3 ("CHE")
			if row[4]:
				keyDict[row[4]] = row[0]
			#OECD ("CHE: Switzerland")
			if row[5]:
				keyDict[row[5]] = row[0]

except IOError:
    print ("Could not open key file")

#print keyDict

outdata = []

try:
	with open(inputFile, 'rb') as csvfile:
		datacsv = csv.reader(csvfile,delimiter=',',quotechar='"')

		firstRow = True
		for row in datacsv:
			if firstRow:
				firstRow = False
			else:
				nationname = row[indataColumn].strip()
				if nationname in keyDict:
					row[outdataColumn] = keyDict[nationname]
			outdata.append(row)

		try:
			with open(outputFile, 'wb') as csvfile:
				writer = csv.writer(csvfile,delimiter=',',quotechar='"')
				for row in outdata:
					writer.writerow(row)
		except IOError:
			print ("Could not open output file")
	
except IOError:
    print ("Could not open input file")
