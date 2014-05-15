<?php

namespace Bolt\Configuration;

use Bolt\Application;
use Symfony\Component\HttpFoundation\Request;


/**
 * A Base Class to handle resource management of paths and urls within a Bolt App.
 *
 * Intended to simplify the ability to override resource location 
 *
 *
 * @author Ross Riley, riley.ross@gmail.com
 *
 */
class ResourceManager
{
    protected $app;
    protected $root;
    protected $requestObject;
    
    protected $paths    = array();
    protected $urls     = array();
    protected $request  = array();

    /**
     * Constructor initialises on the app root path.
     *
     * @param string $path
     */
    public function __construct($root, Application $app, Request $request = null)
    {
        $this->root = realpath($root);
        $this->app  = $app;
        $this->requestObject = $request;
        
        $this->setUrl("root", "/");
        $this->setPath("rootpath", $this->root);
        
        $this->setUrl("app", "/app/");
        $this->setPath("apppath", $this->root."/app");
        
        $this->setUrl("extensions", "/extensions/");
        $this->setPath("extensionspath", $this->root."/extensions");
        
        $this->setUrl("files", "/files/");
        $this->setPath("filespath", $this->root."/files");
        
        $this->setUrl("async",  "/async/");
        $this->setUrl("bolt",   "/bolt/");
        
    }


    public function setPath($name, $value)
    {
        $this->paths[$name] = $value;
    }
    
    public function getPath($name)
    {
        if(!array_key_exists($name, $this->paths)) {
            throw new \InvalidArgumentException("Requested path $name is not available", 1);
        }
        return $this->paths[$name];
    }
    
    public function setUrl($name, $value)
    {
        $this->urls[$name] = $value;
    }
    
    public function getUrl($name)
    {
        if(!array_key_exists($name, $this->urls)) {
            throw new \InvalidArgumentException("Requested url $name is not available", 1);
        }
        return $this->urls[$name];
    }
    
    public function setRequest($name, $value)
    {
        $this->request[$name] = $value;
    }
    
    public function getRequest($name)
    {
        if(!array_key_exists($name, $this->request)) {
            throw new \InvalidArgumentException("Request componenet $name is not available", 1);
        }
        return $this->request[$name];
    }



    public function getPaths()
    {
        return array_merge($this->paths, $this->urls, $this->request);
    }


    /**
     * Takes a Request object and uses it to initialize settings that depend on the request
     *
     * @return void
     **/

    public function initializeRequest(Request $request = null)
    {
        if (null === $request) {
            $request = Request::createFromGlobals();
        }
        
        if (!empty($request->server->get("SERVER_PROTOCOL"))) {
            $protocol = strtolower(substr($request->server->get("SERVER_PROTOCOL"), 0, 5)) == 'https' ? 'https' : 'http';
        } else {
            $protocol = "cli";
        }
        
        $this->setRequest("protocol",  $protocol);
        $this->setRequest("hostname",  $request->server->get('HTTP_HOST'));
        $this->setUrl("current",       $request->getPathInfo());
        $this->setUrl("canonicalurl",  sprintf('%s://%s%s', $this->getRequest("protocol"), $this->getUrl('canonical'), $canonicalpath));
        $this->setUrl("currenturl",    sprintf('%s://%s%s', $this->getRequest("protocol"), $this->getRequest('hostname'), $currentpath));
        $this->setUrl("hosturl",       sprintf('%s://%s',   $this->getRequest("protocol"), $this->getRequest('hostname')));
        $this->setUrl("rooturl",       sprintf('%s://%s%s', $this->getRequest("protocol"), $this->getUrl('canonical'), $this->getUrl("root")));
    }
      
      
    /**
     * Takes a Bolt Application and uses it to initialize settings that depend on the application config
     *
     * @return void
     **/  
    public function initializeApp(Application $app)
    {
        $theme       = $app['config']->get('general/theme');
        $theme_path  = $app['config']->get('general/theme_path');
        $canonical   = $app['config']->get('general/canonical', "");
        
        $this->setPath("themepath", sprintf('%s/%s/%s/', $this->getPath("rootpath"), $theme_path,$theme));
        $this->setUrl("theme",      sprintf('%s/%s',   $theme_path, $theme));
        $this->setUrl("canonical",  $canonical);
    }
    
    public function initialize()
    {
        $this->initializeApp($this->app);
        $this->initializeRequest($this->requestObject);
    }
    
    
 

    
}