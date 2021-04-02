#build: docker build -t f80hub/ipfs-elrond . & docker push f80hub/ipfs-elrond:latest

#prepare: export ipfs_staging=/root/ipfs/staging & export ipfs_data=/root/ipfs/data &
#update:docker rm -f ipfs_host && docker pull f80hub/ipfs-elrond:latest
#run  : docker run -d --name ipfs_host -v $ipfs_staging:/export -v $ipfs_data:/data/ipfs -p 4001:4001 -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 f80hub/ipfs-elrond:latest

FROM ipfs/go-ipfs

EXPOSE 5001
EXPOSE 4001
EXPOSE 8080

#ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://161.97.75.165:5001", "http://localhost:3000", "http://127.0.0.1:5001", "https://webui.ipfs.io"]'
#ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST"]'
