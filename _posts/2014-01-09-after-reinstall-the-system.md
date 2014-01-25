---
layout: post
title: 重装linux-mint系统之后
category: linux
tags: [gnome , linux]
---

# 安装常用工具

```
sudo apt-get install ctags curl git vim tmux meld htop putty subversion  nload  iptraf iftop  openssh-server gconf-editor gnome-tweak-tool
```

# 安装ibus

只需要安装gnome-language-selector ，不用安装im-switch，然后再允许im-config，设置之后注销登陆即可。

```
sudo apt-get install gnome-language-selector 
```

# 安装gedit-markdown

```
wget https://gitorious.org/projets-divers/gedit-markdown/archive/master.zip
cd master
./gedit-markdown.sh install
```

<!-- more -->

# 安装wiz

```
sudo add-apt-repository ppa:wiznote-team
sudo apt-get update
sudo apt-get install wiznote
```

# 安装 oh-my-zsh

```
curl -L https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh | sh
```

# 编辑 ~/.zshrc

```
PATH=$PATH:$HOME/.rvm/bin
[[ -s "$HOME/.rvm/scripts/rvm" ]] && . "$HOME/.rvm/scripts/rvm"

source ~/.bashrc
source ~/.bash_profile
```

# 安装 RVM & Ruby

```
curl -sSL https://get.rvm.io | bash --ruby=1.9.3
```

# 安装jekyll

```
gem install jekyll redcarpet
```

# 安装 virtualbox

```
wget -q http://download.virtualbox.org/virtualbox/debian/oracle_vbox.asc -O- | sudo apt-key add -
sudo apt-get update
sudo apt-get install virtualbox-4.3
```

# 安装fortune-zh

```
sudo apt-get install fortune-zh
```

`/usr/bin/mint-fortune`中调用语句改为:

```
/usr/games/fortune 70% tang300 30% song100 | $command -f $cow -n
```

这里的70%与30%是显示唐诗与宋词的概率。

```
gsettings set com.linuxmint.terminal show-fortunes true
```

# 修改分区权限

```
sudo chown -R june:june /chan
```

# 配置ant、maven和ivy仓库

```
chmod +x /chan/opt/apache-maven-3.0.5/bin/mvn
chmod +x /chan/opt/apache-ant-1.9.2/bin/ant

rm -rf /home/june/.ivy2/cache /home/june/.m2/repository
mkdir -p /home/june/.ivy2 /home/june/.m2
ln -s /chan/opt/repository/cache/  /home/june/.ivy2/cache
ln -s /chan/opt/repository/m2/  /home/june/.m2/repository
```

# 安装jdk1.6.0_31

```
wget http://archive.cloudera.com/cm4/ubuntu/precise/amd64/cm/pool/contrib/o/oracle-j2sdk1.6/oracle-j2sdk1.6_1.6.0+update31_amd64.deb
dpkg -i oracle-j2sdk1.6_1.6.0+update31_amd64.deb
```

配置环境变量：

```
if [ -f ~/.bashrc ] ; then
    sed -i '/^export[[:space:]]\{1,\}JAVA_HOME[[:space:]]\{0,\}=/d' ~/.bashrc
    sed -i '/^export[[:space:]]\{1,\}CLASSPATH[[:space:]]\{0,\}=/d' ~/.bashrc
    sed -i '/^export[[:space:]]\{1,\}PATH[[:space:]]\{0,\}=/d' ~/.bashrc
fi
echo "export JAVA_HOME=/usr/java/latest" >> ~/.bashrc
echo "export CLASSPATH=.:\$JAVA_HOME/lib/tools.jar:\$JAVA_HOME/lib/dt.jar">>~/.bashrc
echo "export MVN_HOME=/chan/opt/apache-maven-3.0.5" >> ~/.bashrc

echo "export ANT_HOME=/chan/opt/apache-ant-1.9.2" >> ~/.bashrc
echo "export PATH=\$JAVA_HOME/bin:\$MVN_HOME/bin:\$ANT_HOME/bin:\$PATH" >> ~/.bashrc

update-alternatives --install /usr/bin/java java /usr/java/latest 5
update-alternatives --set java /usr/java/latest 
source ~/.bashrc
```

# 重命名home下目录

```
mv ~/文档 ~/projects
mv ~/音乐 ~/opt
mv ~/图片 ~/tmp
mv ~/视频 ~/workspace
mv ~/下载 ~/download

ln -s /chan/opt  ~/opt
ln -s /chan/tmp   ~/tmp
ln -s /chan/projects  ~/projects
ln -s /chan/workspace  ~/workspace
ln -s /chan/download    ~/download
```
