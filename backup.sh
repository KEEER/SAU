#!/bin/bash
folder="_backup.`date +%s`"
mkdir $folder
cp -r files $folder
for i in *.json;do
  cp $i $folder
done
rm $folder/package*
exit 0
