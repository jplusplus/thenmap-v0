# coding=utf-8

#Try and create nation codes (class names) from nation names in a csv
import csv

inputFile = "/home/leo/esc.csv"
outputFile = "/home/leo/esc-out.csv"
indataColumn = 0
outdataColumn = 0

keyDict = {}
try:
	with open('nations keys.csv', 'rb') as csvfile:
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

			

