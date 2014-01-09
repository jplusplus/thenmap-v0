languages =  ["sv","en","fi","fr","de","es","ru","it","nl","pl","zh","pt","ar","ja","fa","no","he","tr","da","uk","ca","id","hu","vi","ko","et","cs","hi","sr","bg"]
startDate =  "1945-01-01"
endDate   =  "2014-12-31"

# wikidata-properties to get when generating the map
# these can be sent to the client, for use in nation infoboxes (e.g. qtip)
# there are only two types of properties: image and text
# NAME: (PROPERTYID, ABBREVIATION)
#
imageProperties  = { 'flag_image': ('P41', 'f') }
entityProperties = { 'capital': ('P36', 'h'), 'currency' : ('P38', 'u'), 'government' : ('P122', 'g') }

import login
