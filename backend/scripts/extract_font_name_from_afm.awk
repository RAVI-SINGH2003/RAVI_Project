BEGIN {
	RS="\r\n|\n"
}
/FullName/		{ print $2}
