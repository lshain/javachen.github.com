---
layout: post

title: 重装Mac系统之后

description: 重装Mac系统之后的一些软件安装和环境变量配置。

keywords: 重装Mac系统

category: DevOps

tags: [mac]

---


本文主要记录重装Mac系统之后的一些软件安装和环境变量配置。


# 系统设置

设置主机名：

```
sudo scutil --set HostName june－mac
```

设置鼠标滚轮滑动的方向：系统偏好设置－－>鼠标－－>"滚动方向：自然"前面的勾去掉

显示/隐藏Mac隐藏文件：

```bash
defaults write com.apple.finder AppleShowAllFiles -bool true  #显示Mac隐藏文件的命令
defaults write com.apple.finder AppleShowAllFiles -bool false #隐藏Mac隐藏文件的命令
```

# 下载常用软件

- 下载jdk6：<http://support.apple.com/downloads/DL1572/en_US/JavaForOSX2013-05.dmg>
- 下载VirtualBox：<http://dlc.sun.com.edgesuite.net/virtualbox/4.3.10/VirtualBox-4.3.10-93012-OSX.dmg>
- 下载vagrant：<https://dl.bintray.com/mitchellh/vagrant/vagrant_1.5.4.dmg>
- 下载Alfred：<http://cachefly.alfredapp.com/Alfred_2.2_243b.zip>


其他常用软件：

- MarkDown编辑器：[Mou](http://mouapp.com/)
- 文本编辑器：TextWrangler
- 解压缩：The Unarchiver

# 安装Homebrew

```
ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)"
```

通过brew安装软件：

```
brew install git curl wget tmux putty gawk
```

# 安装oh-my-zsh

把默认 Shell 换为 zsh。

```
chsh -s /bin/zsh
```

然后用下面的两句（任选其一）可以自动安装 oh-my-zsh：

```
curl -L https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh | sh
```

```
wget --no-check-certificate https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O - | sh
```

编辑`~/.zshrc`：

```
echo 'source ~/.bashrc' >>~/.zshrc
echo 'source ~/.bash_profile' >>~/.zshrc
```

# 安装Vim插件
安装pathogen：

```
mkdir -p ~/.vim/autoload ~/.vim/bundle; \
curl -Sso ~/.vim/autoload/pathogen.vim \
    https://raw.github.com/tpope/vim-pathogen/master/autoload/pathogen.vim
```

安装NERDTree：

```
cd ~/.vim/bundle
git clone https://github.com/scrooloose/nerdtree.git
```

更多请参考：[vim配置和插件管理](/2014/01/14/vim-config-and-plugins/)

# 安装Ruby

先安装依赖(待补充)：

```
brew install libksba
```
通过rvm安装ruby：

```
curl -L get.rvm.io | bash -s stable $ source ~/.bash_profile
sed -i -e 's/ftp\.ruby-lang\.org\/pub\/ruby/ruby\.taobao\.org\/mirrors\/ruby/g' ~/.rvm/config/db
sudo rvm install 1.9.3 --with-gcc=clang
rvm --default 1.9.3
```

# 安装Jekyll

```
sudo gem install rdoc
sudo gem install jekyll redcarpet
```

设置环境变量：

```
echo 'export PATH=$PATH:$HOME/.rvm/bin' >> ~/.bash_profile
echo '[[ -s "$HOME/.rvm/scripts/rvm" ]] && . "$HOME/.rvm/scripts/rvm"' >> ~/.bash_profile
```

# Java开发环境

安装软件，包括ant、maven、ivy、forrest、docker等：

```
brew install https://raw.github.com/Homebrew/homebrew-versions/master/maven30.rb ant ivy apache-forrest docker 
```

配置ant、maven和ivy仓库：

```
rm -rf ~/.ivy2/cache ~/.m2/repository
mkdir -p ~/.ivy2 ~/.m2
ln -s ~/applications/repository/cache/  ~/.ivy2/cache
ln -s ~/applications/repository/m2/  ~/.m2/repository
```

注意，这里我在`~/applications/repository`有两个目录，cache用于存放ivy下载的文件，m2用于存放maven的仓库。

# Python开发环境
TODO