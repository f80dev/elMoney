docker build -t f80hub/elmoney .
start docker push f80hub/elmoney:latest
cd elMoneyAppli
start npm run prod & exit
cd ..
echo "Déployment terminer, poussez sur github"