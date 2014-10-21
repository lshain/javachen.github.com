---
layout: post

title: 重装Mac系统之后

description: 重装Mac系统之后的一些软件安装和环境变量配置。

keywords: 重装Mac系统

category: others

tags: [mac]

---


本文主要记录重装Mac系统之后的一些软件安装和环境变量配置。


# 系统设置

设置主机名：

```bash
$ sudo scutil --set HostName june－mac
```

设置鼠标滚轮滑动的方向：系统偏好设置－－>鼠标－－>"滚动方向：自然"前面的勾去掉

显示/隐藏Mac隐藏文件：

```bash
defaults write com.apple.finder AppleShowAllFiles -bool true  #显示Mac隐藏文件的命令
defaults write com.apple.finder AppleShowAllFiles -bool false #隐藏Mac隐藏文件的命令
```

# 下载常用软件

- 下载jdk6：<http://support.apple.com/downloads/DL1572/en_US/JavaForOSX2013-05.dmg>
- 下载jdk7：<http://download.oracle.com/otn-pub/java/jdk/7u60-b19/jdk-7u60-macosx-x64.dmg?AuthParam=1403450902_0b8ed262d4128ca82031dcbdc2627aaf>
- 下载VirtualBox：<http://dlc.sun.com.edgesuite.net/virtualbox/4.3.10/VirtualBox-4.3.10-93012-OSX.dmg>
- 下载vagrant：<https://dl.bintray.com/mitchellh/vagrant/vagrant_1.5.4.dmg>

其他常用软件：

- 文本编辑器：TextWrangler
- 解压缩：The Unarchiver

# 安装Homebrew

[Brew](http://brew.sh/) 是 Mac 下面的包管理工具，通过 Github 托管适合 Mac 的编译配置以及 Patch，可以方便的安装开发工具。

```bash
$ ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)"
```

通过brew安装软件：

```bash
$ brew install git git-flow  curl  wget  putty  gawk tmux ack source-highlight aria2 dos2unix nmap iotop htop  ctags readline
```

# Brew cask

[Brew cask](https://github.com/phinze/homebrew-cask) 是类似 Brew 的管理工具， 直接提供 dmg 级别的二进制包，（Brew 是不带源码，只有对应项目所在的 URL）。

Brew cask 安装：

```bash
$ brew tap phinze/homebrew-cask
$ brew install brew-cask
```

我通过 Brew cask 安装的软件：

```bash
$ brew cask install qq omnigraffle xtrafinder
```

# 安装oh-my-zsh

把默认 Shell 换为 zsh。

```bash
$ chsh -s /bin/zsh
```

然后用下面的两句（任选其一）可以自动安装 oh-my-zsh：

```bash
$ curl -L https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh | sh
```

```bash
$ wget --no-check-certificate https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O - | sh
```

编辑 `~/.zshrc`：

```
echo 'source ~/.bashrc' >>~/.zshrc
echo 'source ~/.bash_profile' >>~/.zshrc
```

使用ctrl+r查找历史命令，在 `~/.zshrc` 中添加：

```
bindkey "^R" history-incremental-search-backward
```

# 安装Vim插件
安装pathogen：

```bash
$ mkdir -p ~/.vim/autoload ~/.vim/bundle; \
$ curl -Sso ~/.vim/autoload/pathogen.vim \
    https://raw.github.com/tpope/vim-pathogen/master/autoload/pathogen.vim
```

安装NERDTree：

```bash
$ cd ~/.vim/bundle
$ git clone https://github.com/scrooloose/nerdtree.git
```

更多请参考：[vim配置和插件管理](/2014/01/14/vim-config-and-plugins/)

# 安装Ruby

先安装依赖：

```bash
$ brew install libksba autoconf automake libtool gcc46 libyaml readline
```
通过rvm安装ruby：

```bash
$ curl -L get.rvm.io | bash -s stable $ source ~/.bash_profile
$ sed -i -e 's/ftp\.ruby-lang\.org\/pub\/ruby/ruby\.taobao\.org\/mirrors\/ruby/g' ~/.rvm/config/db
$ sudo rvm install 1.9.3 --with-gcc=clang
$ rvm --default 1.9.3
```

# 安装Jekyll

```bash
$ sudo gem install rdoc
$ sudo gem install jekyll redcarpet
```

设置环境变量：

```bash
$ echo 'export PATH=$PATH:$HOME/.rvm/bin' >> ~/.bash_profile
$ echo '[[ -s "$HOME/.rvm/scripts/rvm" ]] && . "$HOME/.rvm/scripts/rvm"' >> ~/.bash_profile
```

# Java开发环境

安装软件，包括ant、maven、ivy、forrest、docker等：

设置 java_home:

```
export JAVA_HOME=$(/usr/libexec/java_home)
```

使用brew来安装

```bash
$ brew install https://raw.github.com/Homebrew/homebrew-versions/master/maven30.rb ant ivy apache-forrest docker 
```

配置ant、maven和ivy仓库：

```bash
$ rm -rf ~/.ivy2/cache ~/.m2/repository
$ mkdir -p ~/.ivy2 ~/.m2
$ ln -s ~/app/repository/cache/  ~/.ivy2/cache
$ ln -s ~/app/repository/m2/  ~/.m2/repository
```

注意，这里我在`~/app/repository`有两个目录，cache用于存放ivy下载的文件，m2用于存放maven的仓库。

# Python开发环境
TODO
