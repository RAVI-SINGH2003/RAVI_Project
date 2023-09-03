import sys
import requests
import time

#take 2 other arguments sorce pdf path and path to save response in txt file

if len(sys.argv) < 3:
    print("Please specify the pdf")
    sys.exit(0)

f = open(sys.argv[1], "rb")

#read the pdf
content = f.read()

f.close()

url = "http://172.17.0.2:5001/"
my_obj = {"file":content}

start = time.time()
print("Sending Request")
x = requests.post(url, content, headers={'Content-Type': 'application/octet-stream'})
print("Response received, Response time ", time.time()-start, " seconds")


with open(sys.argv[2], 'w') as f:
    f.write(x.text)
