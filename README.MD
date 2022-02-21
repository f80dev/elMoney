#Principe
Le principe de CoinMaker est de simplifier la création de monnaies sur la base d'ERC20 et de NFT sur la base d'un contrat inspiré d'ERC721
Il s'agit d'un projet expérimental donc l'objectif premier est de se familliariser 
avec différents concepts de l'environnement
de développement d'Elrond, à savoir :
 - l'écriture de SmartContract en RUST
 - le déploiement de ce contrat via la librairie Python ERDPY
 - la communication entre un serveur python (Flask) et le contrat déployé
 - la création de compte et la gestion des clés depuis le serveur


#Architecture
L'architecture de la solution repose sur 
- une base de données MongoDB pour stocker la liste des monnaies disponible)
- un serveur REST dialoguant avec le front end, la blocchaine et la base de données. Hébergé
- un client web développé sur Angular, compatible avec tout type de terminaux
- un serveur IPFS pour stocker les fichiers des NFT


#Installation de MongoDB
voir 

#Renouvellement des certificats du serveur
désactiver le parefeu depuis cockpit
<pre>
certbot certonly --standalone -d server.f80lab.com
cp /etc/letsencrypt/live/server.f80lab.com/* /root/certs
</pre>


#Mise en oeuvre
##Lancement du serveur principal
Le serveur CoinMaker est hébergé dans un container Docker. Il peut être exécuté sur n'importe quel serveur linux compatible


Il peut se connecter à différente blocchaine suivant l'adresse indiquer au proxy erdpy :
- Testnet : 
<pre>docker rm -f elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 "https://testnet-api.elrond.com" ssl</pre>

- Testnet local : 
<pre>docker rm -f elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 "http://161.97.75.165:7950" ssl</pre>

- MainNet : 
<pre>docker rm -f elmoney && docker run --restart=always -v /root/certs:/certs -p 5555:5555 --name elmoney -d f80hub/elmoney:latest python3 app.py 5555 "https://api.elrond.com" ssl</pre>

##Lancement du noeud IPFS
###Ouverture du firewall
Le répertoire /ipfs contient le docker-compose du noeud
<pre>
firewall-cmd --zone=public --add-port=5001/tcp
firewall-cmd --zone=public --add-port=4001/tcp
firewall-cmd --zone=public --add-port=8080/tcp
</pre>

###Configuration des répertoires
<pre>
mkdir /root/ipfs
mkdir /root/ipfs/staging
mkdir /root/ipfs/data
cd /root/ipfs
export ipfs_staging=/root/ipfs/staging
export ipfs_data=/root/ipfs/data
docker rm -f ipfs_host
docker run -d --name ipfs_host -v $ipfs_staging:/export -v $ipfs_data:/data/ipfs -p 4001:4001 -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 ipfs/go-ipfs:latest
</pre>

###Gérer la problématique de CORS
<pre>
docker exec ipfs_host ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3000", "https://webui.ipfs.io", "http://127.0.0.1:5001"]'
docker exec ipfs_host ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["POST"]'
docker logs -f ipfs_host
</pre>


L'interface de gestion est disponible sur http://161.97.75.165/#/

Récupération du fichier 




