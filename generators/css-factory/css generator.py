import pyssed
import csv
import pprint

# ---- ThenMap coloring ---------
# This script does the following:
# - Open a csv file that defines what countries should be colored at what years
# - It outputs a css file that can be used to color ThenMaps

# Mandatory columns in the csv file:
# - land (eg. se, fi, no)
# - color (in CSS compatible format, eg. #FF0000 or red)

# Every row should also be defined with a year or a range of years:
# -	from (YYYY)
# - to (YYYY)
# - year (YYYY)


# ---- START HERE ---
delimiter = ";" 				# Set CSV delimiter
csvToOpen = "sample_data.csv" 	# File to open
cssFile = "thenmap.css" 		# Set name of output file

pp = pprint.PrettyPrinter(indent=2)

# Define variables
fillColors = {}
css = {}


# Function: check if string is numeric
def is_number(s):
    try:
        float(s)
        return True
    except ValueError:
        return False

# Function: Add fill color to dict
def addFillColor(year,land,color):
	if color not in fillColors:
		fillColors[color] = []
	fillColors[color].append(".y{0} land.{1}".format(year, land))

# Open and iterate csv file
file = csv.DictReader(open(csvToOpen), delimiter=delimiter)
for i,row in enumerate(file):
	color = row['color']
	land = row['land']
	
	# If range is defined, loop the timespan and add colors
	if (is_number(row['from']) and is_number(row['to'])):
		for year in range(int(float(row['from'])), int(float(row['to'])) + 1):
			addFillColor(year,land,color)
	
	# If specific year is defined, add color for that year
	elif (is_number(row['year'])):
		year = row['year']
		addFillColor(year,land,color)
	else:
		print "Error at row {0} ({1}). Could not detect time. Make sure columns 'to', 'from' and 'year' are defined as YYYY (eg. 2013)".format(i, row) 

# Transform to css structure
for color in fillColors:
	classes = ",".join(fillColors[color])
	css[classes] = { 'fill': color }

# Write to file
try:
	f = open(cssFile, "w")
	try:
		f.write('\n'.join(pyssed.generate(css))) # Write a string to a file
	finally:
		f.close()
except IOError:
	pass

print "{0} created!".format(cssFile) 
