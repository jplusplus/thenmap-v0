import csv
import argparse
import os.path
import sys


# From http://danieljlewis.org/files/2010/06/Jenks.pdf
def getJenksBreaks( dataList, numClass ): 
 
	dataList.sort() 

	mat1 = [] 
	for i in range(0,len(dataList)+1):
		temp = [] 
		for j in range(0,numClass+1):
			temp.append(0)
		mat1.append(temp) 

	mat2 = [] 
	for i in range(0,len(dataList)+1):
		temp = [] 
		for j in range(0,numClass+1): 
			temp.append(0) 
		mat2.append(temp) 

	for i in range(1,numClass+1): 
		mat1[1][i] = 1 
		mat2[1][i] = 0 
		for j in range(2,len(dataList)+1): 
			mat2[j][i] = float('inf') 
			
	v = 0.0 
	for l in range(2,len(dataList)+1): 
		s1 = 0.0 
		s2 = 0.0 
		w = 0.0 
		for m in range(1,l+1): 
			i3 = l - m + 1 
			 
			val = float(dataList[i3-1]) 

			s2 += val * val 
			s1 += val 

			w += 1 
			v = s2 - (s1 * s1) / w 
			i4 = i3 - 1 

			if i4 != 0: 
				for j in range(2,numClass+1): 
					if mat2[l][j] >= (v + mat2[i4][j - 1]): 
						mat1[l][j] = i3 
						mat2[l][j] = v + mat2[i4][j - 1]
		mat1[l][1] = 1 
		mat2[l][1] = v

	k = len(dataList) 
	kclass = [] 
	for i in range(0,numClass+1): 
		kclass.append(0) 

	kclass[numClass] = float(dataList[len(dataList) - 1]) 

	countNum = numClass 
	while countNum >= 2:
		#print "rank = " + str(mat1[k][countNum])
		id = int((mat1[k][countNum]) - 2)
		#print "val = " + str(dataList[id]) 

		kclass[countNum - 1] = dataList[id] 
		k = int((mat1[k][countNum] - 1)) 
		countNum -= 1 

	return kclass 

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
    
args = parser.parse_args()

inputFile = args.infile

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


numberOfJenksBreaks = 8

#####################################################################################

values = []
#Open file
try:
	with open(inputFile, 'rb') as csvfile:
		datacsv = csv.reader(csvfile,delimiter=',',quotechar='"')
		firstRow = True
		for row in datacsv:
			if firstRow:
				firstRow = False
			else:
				for col in row:
					if is_number(col):
						values.append(col)

except IOError:
    print ("Could not open key file")
    
jenksBreaks = getJenksBreaks( values, numberOfJenksBreaks )
print jenksBreaks

#Loop through all rows and cols and convert any numerical values to a color
#https://pypi.python.org/pypi/colorbrewer
