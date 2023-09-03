##########################################################################
#
# @fileoverview Extract relevant font information from afm file into a 
#		single line json. (A single line json allows information
#		from multiple afm files to be combined into a single file 
#		consisting of json lines, one from each afm)
# 
# @author  	himanshu.garg@cse.iitd.ac.in (Himanshu Garg)
# 
# @usage   	awk -f <script-name> <path-to-afm-file> 
# 
##########################################################################

BEGIN {
	RS="\r\n|\n"
}
/FontName/		{ printf "{ \"%s\": { ", $2}
/C \w+ ; WX \w+ ; N /	{ printf "\"%s\": \"%s\", ", $2, $8 }
ENDFILE {
	print "}}";
}
