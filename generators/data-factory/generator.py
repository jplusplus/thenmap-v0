# coding=utf-8
import csv

#Create css from csv with class names and numerical data, i.e.
#nation,1956,1957,1957
#se,       1,   4,   4
#no,       0,   2,   3

inputFile = "/home/leo/esc-out.csv"
outputFile = "/home/leo/esc-css"
nationColumn = 0
color = 900

outStr = ''

try:
	with open(inputFile, 'rb') as csvfile:
		reader = csv.reader(csvfile,delimiter=',',quotechar='"')
		firstRow = True
		headers = []
		for row in reader:
			if firstRow:
				firstRow = False
				for h in row:
					headers.append(h)
				print headers
			else:
				if row[nationColumn]:
					i = 0
					for c in row:
						if not(i == nationColumn):
							if c:
								outStr = outStr + ".y" + headers[i] + " ." + row[nationColumn] + " {fill:#900} "
						i += 1
	
except IOError:
    print ("Could not open input file")
    
print outStr
