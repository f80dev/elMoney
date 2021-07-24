import requests

from definitions import GIPHY_API_KEY


class Giphy:
    api_key=GIPHY_API_KEY

    def __init__(self):
        pass

    def search(self,query):
        url="https://api.giphy.com/v1/stickers/search?api_key="+self.api_key+"&q="+query
        results=requests.get(url).json()
        rc=[]
        for result in results["data"]:
            rc.append({"preview":result["images"]["preview_webp"]["url"],"src":result["images"]["preview_webp"]["url"]})
        return rc
